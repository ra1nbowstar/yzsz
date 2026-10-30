<template>
	<view class="staff-page">
		<!-- 添加员工卡片 -->
		<view class="add-staff-card" @tap="showAddStaffModal">
			<view class="card-content">
				<view class="icon-section">
					<view class="icon-circle">
						<text class="icon-text">👤</text>
					</view>
				</view>
				<view class="text-section">
					<text class="card-title">添加员工</text>
					<text class="card-desc">通过ID添加员工账号</text>
				</view>
				<view class="arrow-section">
					<text class="arrow-icon">›</text>
				</view>
			</view>
		</view>

		<!-- 添加员工弹窗 -->
		<view v-if="showModal" class="modal-overlay" @tap="closeModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">添加员工</text>
					<text class="modal-close" @tap="closeModal">×</text>
				</view>
				<view class="modal-body">
					<view class="input-group">
						<text class="input-label">员工ID</text>
						<input 
							v-model="staffId" 
							type="text" 
							class="input-field" 
							placeholder="请输入员工ID"
							:adjust-position="true"
						/>
					</view>
				</view>
				<view class="modal-footer">
					<button class="modal-btn cancel" @tap="closeModal">取消</button>
					<button class="modal-btn confirm" @tap="confirmAddStaff">确认</button>
				</view>
			</view>
		</view>

		<!-- 员工列表 -->
		<view class="staff-list">
			<view 
				v-for="staff in staffList" 
				:key="staff.id"
				class="staff-item"
			>
				<image :src="staff.avatar" class="staff-avatar" mode="aspectFill" />
				<view class="staff-info">
					<view class="staff-header">
						<text class="staff-name">{{ staff.name }}</text>
						<view class="staff-status" :class="staff.online ? 'online' : 'offline'">
							<text class="status-dot"></text>
							<text class="status-text">{{ staff.online ? '在线' : '离线' }}</text>
						</view>
					</view>
					<text class="staff-role">{{ staff.role }}</text>
					<text class="staff-phone">{{ staff.phone }}</text>
				</view>
				<view class="staff-actions">
					<text class="action-icon iconfont icon-bianji" @tap="editStaff(staff)"></text>
					<text class="action-icon iconfont icon-shanchu" @tap="deleteStaff(staff)"></text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request.js'
import { getMobileByUserId } from '@/api/user.js'

const staffList = ref([])
const showModal = ref(false)
const staffId = ref('')

/**
 * 显示添加员工弹窗
 */
const showAddStaffModal = () => {
	staffId.value = ''
	showModal.value = true
}

/**
 * 关闭弹窗
 */
const closeModal = () => {
	showModal.value = false
	staffId.value = ''
}

/**
 * 确认添加员工
 */
const confirmAddStaff = async () => {
	// 验证ID
	if (!staffId.value || !staffId.value.trim()) {
		uni.showToast({ title: '请输入员工ID', icon: 'none' })
		return
	}
	
	try {
		uni.showLoading({ title: '添加中...' })
		
		// 通过ID获取手机号
		let mobile = null
		try {
			const mobileRes = await getMobileByUserId(staffId.value.trim(), 'gm2025')
			console.log('[添加员工] 获取手机号响应')
			
			// 解析返回的手机号（兼容多种响应格式）
			if (mobileRes) {
				if (mobileRes.data && typeof mobileRes.data === 'object' && mobileRes.data.mobile) {
					mobile = mobileRes.data.mobile
				} else if (mobileRes.mobile) {
					mobile = mobileRes.mobile
				} else if (mobileRes.data && typeof mobileRes.data === 'string') {
					mobile = mobileRes.data
				} else if (typeof mobileRes === 'string') {
					mobile = mobileRes
				}
			}
			
			if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
				uni.hideLoading()
				uni.showToast({ title: '未找到该ID对应的手机号', icon: 'none', duration: 3000 })
				return
			}
			
			console.log('[添加员工] 通过ID获取到手机号:', String(mobile).slice(0, 3) + '****' + String(mobile).slice(-4))
		} catch (error) {
			uni.hideLoading()
			console.error('[添加员工] 获取手机号失败:', error)
			const errorMsg = error.message || error.detail || error.msg || '获取手机号失败，请检查ID是否正确'
			uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
			return
		}
		
		// 调用授权商户接口（使用获取到的手机号）
		const url = `/user/grant-merchant?mobile=${encodeURIComponent(mobile)}&admin_key=gm2025`
		const res = await request.post(url, {})
		
		uni.hideLoading()
		uni.showToast({ title: '添加成功', icon: 'success' })
		closeModal()
		
		// 刷新员工列表
		loadStaffList()
	} catch (error) {
		uni.hideLoading()
		console.error('添加员工失败:', error)
		const errorMsg = error.message || error.detail || error.msg || '添加失败，请重试'
		uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
	}
}

/**
 * 加载员工列表
 */
const loadStaffList = async () => {
	// TODO: 如果有员工列表接口，可以在这里调用
	// 目前先保持空列表
	staffList.value = []
}

onMounted(() => {
	loadStaffList()
})

onShow(() => {
	loadStaffList()
})

const editStaff = (staff) => {
	uni.showToast({ title: `编辑${staff.name}`, icon: 'none' })
}

const deleteStaff = (staff) => {
	uni.showModal({
		title: '确认删除',
		content: `确定要删除员工"${staff.name}"吗？`,
		success: (res) => {
			if (res.confirm) {
				uni.showToast({ title: '删除成功', icon: 'success' })
			}
		}
	})
}
</script>

<style scoped>
.staff-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding: 30rpx;
	display: flex;
	flex-direction: column;
}

.add-staff-card {
	background: white;
	border-radius: 16rpx;
	margin-bottom: 30rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	transition: all 0.3s;
}

.add-staff-card:active {
	transform: scale(0.98);
	box-shadow: 0 1rpx 6rpx rgba(0, 0, 0, 0.1);
}

.card-content {
	display: flex;
	align-items: center;
	padding: 32rpx 30rpx;
	gap: 20rpx;
}

.icon-section {
	flex-shrink: 0;
}

.icon-circle {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #ff9800, #ff6b35);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(255, 152, 0, 0.25);
	flex-shrink: 0;
}

.icon-text {
	font-size: 40rpx;
	line-height: 1;
}

.text-section {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	min-width: 0;
}

.card-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333;
	line-height: 1.5;
}

.card-desc {
	font-size: 24rpx;
	color: #999;
	line-height: 1.5;
}

.arrow-section {
	flex-shrink: 0;
	width: 40rpx;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.arrow-icon {
	font-size: 32rpx;
	color: #ccc;
	line-height: 1;
	font-weight: 300;
}

.staff-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.staff-item {
	background: white;
	border-radius: 16rpx;
	padding: 24rpx;
	display: flex;
	align-items: center;
	gap: 20rpx;
}

.staff-avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	flex-shrink: 0;
}

.staff-info {
	flex: 1;
}

.staff-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 8rpx;
}

.staff-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.staff-status {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
}

.staff-status.online {
	background: #e8f5e9;
	color: #4caf50;
}

.staff-status.offline {
	background: #f5f5f5;
	color: #999;
}

.status-dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: currentColor;
}

.staff-role {
	display: block;
	font-size: 24rpx;
	color: #666;
	margin-bottom: 4rpx;
}

.staff-phone {
	font-size: 22rpx;
	color: #999;
}

.staff-actions {
	display: flex;
	gap: 20rpx;
}

.action-icon {
	font-size: 32rpx;
}

/* 弹窗样式 */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.modal-content {
	background: white;
	border-radius: 20rpx;
	width: 600rpx;
	max-width: 90%;
	max-height: 80vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
	flex-shrink: 0;
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.modal-close {
	font-size: 48rpx;
	color: #999;
	line-height: 1;
	cursor: pointer;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-body {
	padding: 30rpx;
	flex: 1;
	overflow-y: auto;
}

.input-group {
	margin-bottom: 0;
}

.input-label {
	display: block;
	font-size: 26rpx;
	color: #666;
	margin-bottom: 12rpx;
	font-weight: 500;
}

.input-field {
	width: 100%;
	padding: 0 20rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	font-size: 28rpx;
	color: #333;
	text-align: left;
	line-height: 80rpx;
	box-sizing: border-box;
	border: 1rpx solid #e0e0e0;
	transition: border-color 0.3s;
	height: 80rpx;
	min-height: 80rpx;
	vertical-align: middle;
}

.input-field:focus {
	border-color: #ff9800;
	background: #fff;
}

.modal-footer {
	display: flex;
	gap: 20rpx;
	padding: 30rpx;
	border-top: 1rpx solid #f0f0f0;
	flex-shrink: 0;
}

.modal-btn {
	flex: 1;
	height: 72rpx;
	border-radius: 36rpx;
	font-size: 28rpx;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.3s;
}

.modal-btn:active {
	opacity: 0.8;
}

.modal-btn.cancel {
	background: #f5f5f5;
	color: #666;
}

.modal-btn.confirm {
	background: #ff9800;
	color: white;
	font-weight: 600;
}
</style>
