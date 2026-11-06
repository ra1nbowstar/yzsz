<template>
	<view class="member-list-page">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">{{ pageTitle }}</text>
			<text class="page-count">共 {{ totalCount }} 人</text>
		</view>
		
		<!-- 会员列表 -->
		<view class="member-list">
			<view 
				v-for="member in memberList" 
				:key="member.id"
				class="member-card"
			>
				<image 
					:src="getMemberAvatar(member)" 
					class="member-avatar" 
					mode="aspectFill"
					@error="handleAvatarError"
				/>
				<view class="member-info">
					<view class="member-header">
						<text class="member-name">{{ member.nickname }}</text>
						<view class="member-level" :class="'level-' + member.level" v-if="member.level > 0">
							<text class="level-text">{{ getLevelText(member.level) }}</text>
						</view>
					</view>
					<view class="member-stats">
						<text class="stat-item">直推: {{ member.directCount || 0 }}人</text>
						<text class="stat-divider">|</text>
						<text class="stat-item">团队: {{ member.teamSize || 0 }}人</text>
					</view>
				</view>
				<view class="member-actions">
					<!-- 查看下级按钮 -->
					<view 
						v-if="member.directCount > 0" 
						class="action-btn view-children-btn" 
						@tap.stop="viewMemberChildren(member)"
					>
						<text class="action-btn-text">下级</text>
					</view>
					<!-- 查看详情按钮 -->
					<view class="action-btn detail-btn" @tap.stop="viewMemberDetail(member)">
						<text class="action-btn-text">详情</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-if="memberList.length === 0 && !loading">
			<text class="empty-icon">👥</text>
			<text class="empty-text">暂无会员数据</text>
		</view>
		
		<!-- 加载更多 -->
		<view class="load-more" v-if="hasMore" @tap="loadMore">
			<text class="load-text">加载更多</text>
		</view>
		
		<!-- 加载中 -->
		<view class="loading" v-if="loading">
			<text class="loading-text">加载中...</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getReferDirect, getReferTeam, getUserInfo } from '@/api/user.js'
import { getAvatarUrl } from '@/utils/avatar.js'

// 页面参数
const filterType = ref('') // all, direct, active, star, layer
const layerNumber = ref(0)
const pageTitle = ref('会员列表')
const targetMobile = ref('') // 指定查看哪个成员的直推成员
const targetName = ref('') // 指定成员的名称

// 数据
const memberList = ref([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = ref(20)
const hasMore = ref(true)
const loading = ref(false)

/**
 * 页面加载
 */
onLoad((options) => {
	filterType.value = options.filterType || options.type || 'all'
	layerNumber.value = parseInt(options.layer || 0)
	targetMobile.value = options.mobile || ''
	targetName.value = options.name ? decodeURIComponent(options.name) : ''
	
	// 设置页面标题
	if (targetName.value && filterType.value === 'direct') {
		pageTitle.value = `${targetName.value}的直推成员`
	} else {
		switch (filterType.value) {
			case 'all':
				pageTitle.value = '团队总人数'
				break
			case 'direct':
				pageTitle.value = '直推会员'
				break
			case 'active':
				pageTitle.value = '活跃会员'
				break
			case 'star':
				pageTitle.value = '星级店长'
				break
			case 'layer':
				pageTitle.value = `第${layerNumber.value}层团队`
				break
			default:
				pageTitle.value = '会员列表'
		}
	}
	
	uni.setNavigationBarTitle({ title: pageTitle.value })
	
	loadMembers()
})

/**
 * 加载会员列表
 */
const loadMembers = async () => {
	if (loading.value) return
	
	loading.value = true
	
	try {
		// 获取当前用户的手机号（如果指定了 targetMobile，则使用 targetMobile）
		const userInfo = uni.getStorageSync('userInfo') || {}
		const mobile = targetMobile.value || userInfo.mobile || userInfo.phone
		
		if (!mobile) {
			console.error('缺少用户手机号')
			uni.showToast({ title: '请先登录', icon: 'none' })
			loading.value = false
			return
		}
		
		let res
		let newMembers = []
		
		if (filterType.value === 'all') {
			// 团队总人数：使用 /user/refer-team 接口（递归）
			res = await getReferTeam({ mobile, max_layer: 6 })
			
			// 解析响应数据：可能是 {rows: [...]} 或直接是数组
			let teamList = []
			if (res.data) {
				teamList = res.data.rows || res.data || []
			} else if (res.rows) {
				teamList = res.rows
			} else if (Array.isArray(res)) {
				teamList = res
			}
			
			// 递归提取所有成员（扁平化）
			const flattenMembers = (members) => {
				const result = []
				if (!Array.isArray(members)) return result
				
				members.forEach(member => {
					const memberMobile = member.mobile || member.phone
					if (memberMobile) {
						result.push({
							id: member.id || member.user_id || member.uid,
							user_id: member.id || member.user_id || member.uid,
							nickname: member.name || member.nickname || '未设置昵称',
							name: member.name || member.nickname || '未设置昵称',
							mobile: memberMobile,
							avatar: member.avatar || member.avatar_path || '',
					avatar_path: member.avatar_path || member.avatar || '',
							level: member.member_level || member.level || 0,
							member_level: member.member_level || member.level || 0,
							teamSize: member.teamSize || 0,
							directCount: member.directCount || 0,
							created_at: member.created_at || member.createdAt || ''
						})
					}
					
					// 递归处理子成员
					if (member.children && Array.isArray(member.children)) {
						result.push(...flattenMembers(member.children))
					}
				})
				
				return result
			}
			
			const flattened = flattenMembers(teamList)
			// 为每个成员获取直推人数和团队人数
			newMembers = await Promise.all(flattened.map(async (member) => {
				let directCount = 0
				let teamSize = member.teamSize || 0
				const memberMobile = member.mobile
				if (memberMobile) {
					try {
						const directRes = await getReferDirect({ 
							mobile: memberMobile, 
							page: 1, 
							size: 1 
						})
						directCount = directRes.data?.total || directRes.total || 0
						
						// 如果 API 返回的数据中没有 teamSize，则通过 getReferTeam 获取
						if (!teamSize || teamSize === 0) {
							try {
								const teamRes = await getReferTeam({ mobile: memberMobile, max_layer: 6 })
								// 解析响应数据
								let teamData = null
								if (teamRes.data) {
									teamData = teamRes.data.rows || teamRes.data.list || teamRes.data
								} else if (teamRes.rows) {
									teamData = teamRes.rows
								} else if (teamRes.list) {
									teamData = teamRes.list
								} else if (Array.isArray(teamRes)) {
									teamData = teamRes
								}
								
								// 递归计算团队总人数
								const countTeamMembers = (members) => {
									if (!Array.isArray(members)) return 0
									let count = 0
									members.forEach(m => {
										count++
										if (m.children && Array.isArray(m.children)) {
											count += countTeamMembers(m.children)
										}
									})
									return count
								}
								teamSize = countTeamMembers(teamData) || 0
							} catch (e) {
								console.error('获取团队人数失败', e)
							}
						}
					} catch (e) {
						console.error('获取直推人数失败', e)
					}
				}
				
				// 从用户详情接口获取头像
				let avatar_path = member.avatar_path || member.avatar || ''
				// 普通用户不能通过 GET /user/info 查询他人资料，直接使用团队接口返回的头像字段
				
				return {
					...member,
					avatar: avatar_path || '',
					avatar_path: avatar_path || '',
					directCount: directCount,
					teamSize: teamSize
				}
			}))
			totalCount.value = newMembers.length
			hasMore.value = false // 递归接口返回所有数据，不需要分页
			
		} else if (filterType.value === 'direct') {
			// 直推会员：使用 /user/refer-direct 接口（有分页）
			res = await getReferDirect({ 
				mobile,
				page: page.value, 
				size: pageSize.value
			})
			
			// 解析响应数据：{ rows: [], total: 0, page: 1, size: 10 }
			const responseData = res.data || res
			const rows = responseData.rows || []
			const total = responseData.total || 0
			
			// 为每个成员获取直推人数和团队人数
			newMembers = await Promise.all(rows.map(async (member) => {
				let directCount = 0
				let teamSize = member.teamSize || member.team_count || 0
				const memberMobile = member.mobile || member.phone
				if (memberMobile) {
					try {
						const directRes = await getReferDirect({ 
							mobile: memberMobile, 
							page: 1, 
							size: 1 
						})
						directCount = directRes.data?.total || directRes.total || 0
						
						// 如果 API 返回的数据中没有 teamSize，则通过 getReferTeam 获取
						if (!teamSize || teamSize === 0) {
							try {
								const teamRes = await getReferTeam({ mobile: memberMobile, max_layer: 6 })
								// 解析响应数据
								let teamData = null
								if (teamRes.data) {
									teamData = teamRes.data.rows || teamRes.data.list || teamRes.data
								} else if (teamRes.rows) {
									teamData = teamRes.rows
								} else if (teamRes.list) {
									teamData = teamRes.list
								} else if (Array.isArray(teamRes)) {
									teamData = teamRes
								}
								
								// 递归计算团队总人数
								const countTeamMembers = (members) => {
									if (!Array.isArray(members)) return 0
									let count = 0
									members.forEach(m => {
										count++
										if (m.children && Array.isArray(m.children)) {
											count += countTeamMembers(m.children)
										}
									})
									return count
								}
								teamSize = countTeamMembers(teamData) || 0
							} catch (e) {
								console.error('获取团队人数失败', e)
							}
						}
					} catch (e) {
						console.error('获取直推人数失败', e)
					}
				}
				
				// 从用户详情接口获取头像
				let avatar_path = member.avatar_path || member.avatar || ''
				// 普通用户不能通过 GET /user/info 查询他人资料，直接使用团队接口返回的头像字段
				
				return {
					id: member.id || member.user_id || member.uid,
					user_id: member.id || member.user_id || member.uid,
					nickname: member.name || member.nickname || '未设置昵称',
					name: member.name || member.nickname || '未设置昵称',
					mobile: memberMobile,
					avatar: avatar_path || '',
					avatar_path: avatar_path || '',
					level: member.member_level || member.level || 0,
					member_level: member.member_level || member.level || 0,
					teamSize: teamSize,
					directCount: directCount,
					created_at: member.created_at || member.createdAt || ''
				}
			}))
			
			totalCount.value = total
			const currentTotal = page.value === 1 ? newMembers.length : memberList.value.length + newMembers.length
			hasMore.value = currentTotal < total
			
		} else {
			// 其他类型使用直推接口
			res = await getReferDirect({ 
				mobile,
				page: page.value, 
				size: pageSize.value
			})
			
			const responseData = res.data || res
			const rows = responseData.rows || []
			const total = responseData.total || 0
			
			const memberPromises = rows.map(async (member) => {
				let directCount = 0
				let teamSize = member.teamSize || member.team_count || 0
				const memberMobile = member.mobile || member.phone
				if (memberMobile) {
					try {
						const directRes = await getReferDirect({ 
							mobile: memberMobile, 
							page: 1, 
							size: 1 
						})
						directCount = directRes.data?.total || directRes.total || 0
						
						// 如果 API 返回的数据中没有 teamSize，则通过 getReferTeam 获取
						if (!teamSize || teamSize === 0) {
							try {
								const teamRes = await getReferTeam({ mobile: memberMobile, max_layer: 6 })
								// 解析响应数据
								let teamData = null
								if (teamRes.data) {
									teamData = teamRes.data.rows || teamRes.data.list || teamRes.data
								} else if (teamRes.rows) {
									teamData = teamRes.rows
								} else if (teamRes.list) {
									teamData = teamRes.list
								} else if (Array.isArray(teamRes)) {
									teamData = teamRes
								}
								
								// 递归计算团队总人数
								const countTeamMembers = (members) => {
									if (!Array.isArray(members)) return 0
									let count = 0
									members.forEach(m => {
										count++
										if (m.children && Array.isArray(m.children)) {
											count += countTeamMembers(m.children)
										}
									})
									return count
								}
								teamSize = countTeamMembers(teamData) || 0
							} catch (e) {
								console.error('获取团队人数失败', e)
							}
						}
					} catch (e) {
						console.error('获取直推人数失败', e)
					}
				}
				
				// 从用户详情接口获取头像
				let avatar_path = member.avatar_path || member.avatar || ''
				// 普通用户不能通过 GET /user/info 查询他人资料，直接使用团队接口返回的头像字段
				
				return {
					id: member.id || member.user_id || member.uid,
					user_id: member.id || member.user_id || member.uid,
					nickname: member.name || member.nickname || '未设置昵称',
					name: member.name || member.nickname || '未设置昵称',
					mobile: memberMobile,
					avatar: avatar_path || '',
					avatar_path: avatar_path || '',
					level: member.member_level || member.level || 0,
					member_level: member.member_level || member.level || 0,
					teamSize: teamSize,
					directCount: directCount,
					created_at: member.created_at || member.createdAt || ''
				}
			})
			
			// 等待所有 Promise 完成
			newMembers = await Promise.all(memberPromises)
			
			totalCount.value = newMembers.length
			hasMore.value = false
		}
		
		if (page.value === 1) {
			memberList.value = newMembers
		} else {
			memberList.value = [...memberList.value, ...newMembers]
		}
		
	} catch (error) {
		console.error('加载会员列表失败', error)
		uni.showToast({ title: '加载失败', icon: 'none' })
		// API 失败时返回空数组
		if (page.value === 1) {
			memberList.value = []
		}
		totalCount.value = 0
		hasMore.value = false
	} finally {
		loading.value = false
	}
}

/**
 * 加载更多
 */
const loadMore = () => {
	if (!hasMore.value || loading.value) return
	page.value++
	loadMembers()
}


/**
 * 查看会员详情
 */
const viewMemberDetail = (member) => {
	if (!member || !member.mobile) {
		uni.showToast({
			title: '成员信息不完整',
			icon: 'none'
		})
		return
	}
	uni.navigateTo({ 
		url: `/subPackages/page2/pages/team/member-detail?mobile=${encodeURIComponent(member.mobile)}` 
	})
}

/**
 * 查看成员的下级（跳转到成员列表页面）
 */
const viewMemberChildren = (member) => {
	if (!member || !member.mobile) {
		uni.showToast({
			title: '成员信息不完整',
			icon: 'none'
		})
		return
	}
	
	if (!member.directCount || member.directCount === 0) {
		uni.showToast({
			title: '该成员暂无直推成员',
			icon: 'none'
		})
		return
	}
	
	// 跳转到成员列表页面，显示该成员的直推成员
	uni.navigateTo({
		url: `/subPackages/page1/pages/team/member-list?mobile=${encodeURIComponent(member.mobile)}&name=${encodeURIComponent(member.nickname || member.name || member.mobile)}&filterType=direct`
	})
}

/**
 * 获取等级文本
 */
const getLevelText = (level) => {
	const texts = ['普通用户', '一星店长', '二星店长', '三星店长', '四星店长', '五星店长', '六星店长']
	return texts[level] || '普通用户'
}

/**
 * 获取成员头像
 */
const getMemberAvatar = (member) => {
	if (!member) {
		console.log('[getMemberAvatar] 成员为空，使用默认头像')
		return '/static/logo.png'
	}
	
	console.log('[getMemberAvatar] 成员数据:', {
		mobile: member.mobile,
		avatar_path: member.avatar_path,
		avatar: member.avatar
	})
	
	// 优先使用 avatar_path
	if (member.avatar_path) {
		const url = getAvatarUrl(member.avatar_path)
		console.log('[getMemberAvatar] 使用 avatar_path:', url)
		return url
	}
	
	// 其次使用 avatar
	if (member.avatar) {
		const url = getAvatarUrl(member.avatar)
		console.log('[getMemberAvatar] 使用 avatar:', url)
		return url
	}
	
	// 尝试其他可能的字段
	if (member.image || member.image_url) {
		const url = getAvatarUrl(member.image || member.image_url)
		console.log('[getMemberAvatar] 使用 image/image_url:', url)
		return url
	}
	
	// 默认头像
	console.log('[getMemberAvatar] 没有找到头像，使用默认头像')
	return '/static/logo.png'
}

/**
 * 处理头像加载错误
 */
const handleAvatarError = (e) => {
	console.log('[头像加载失败]', e)
	// 头像加载失败时，使用默认头像
	if (e && e.target) {
		e.target.src = '/static/logo.png'
	}
}

/**
 * 格式化时间
 */
const formatTime = (time) => {
	if (!time) return ''
	const date = new Date(time)
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.member-list-page {
	min-height: 100vh;
	background: #f5f5f5;
	padding-bottom: 40rpx;
}

.page-header {
	background: white;
	padding: 30rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1rpx solid #f0f0f0;
}

.page-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.page-count {
	font-size: 24rpx;
	color: #666;
}

.member-list {
	padding: 20rpx 30rpx;
}

.member-card {
	background: white;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	gap: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.member-avatar {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	flex-shrink: 0;
	background: #e0e0e0;
}

.member-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.member-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.member-name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.member-level {
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
	flex-shrink: 0;
}

.member-level.level-1 { background: rgba(192, 192, 192, 0.2); color: #666; }
.member-level.level-2 { background: rgba(255, 215, 0, 0.2); color: #b8860b; }
.member-level.level-3 { background: rgba(255, 105, 180, 0.2); color: #c71585; }
.member-level.level-4 { background: rgba(138, 43, 226, 0.2); color: #8a2be2; }
.member-level.level-5 { background: rgba(255, 69, 0, 0.2); color: #ff4500; }
.member-level.level-6 { background: rgba(255, 20, 147, 0.2); color: #ff1493; }

.level-text {
	font-size: 20rpx;
}

.member-mobile {
	font-size: 24rpx;
	color: #999;
}

.member-stats {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.stat-item {
	font-size: 24rpx;
	color: #666;
}

.stat-divider {
	font-size: 24rpx;
	color: #ddd;
}

/* 操作按钮组 */
.member-actions {
	display: flex;
	gap: 12rpx;
	justify-content: flex-end;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
	transition: all 0.2s;
	min-width: 60rpx;
	white-space: nowrap;
}

.view-children-btn {
	background: #3d6bff;
	color: #fff;
}

.view-children-btn:active {
	opacity: 0.8;
}

.detail-btn {
	background: transparent;
	color: #666;
	border: 1rpx solid #e0e0e0;
}

.detail-btn:active {
	background: #f5f5f5;
}

.action-btn-text {
	font-size: 26rpx;
	font-weight: 500;
	line-height: 1.2;
}


.empty-state {
	text-align: center;
	padding: 120rpx 0;
}

.empty-icon {
	display: block;
	font-size: 120rpx;
	margin-bottom: 20rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}

.load-more {
	text-align: center;
	padding: 30rpx;
}

.load-text {
	font-size: 26rpx;
	color: #3d6bff;
}

.loading {
	text-align: center;
	padding: 30rpx;
}

.loading-text {
	font-size: 26rpx;
	color: #999;
}
</style>
