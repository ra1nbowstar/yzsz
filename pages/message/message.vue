<template>
	<view class="message-page">
		<view class="message-header">
			<text class="header-title">消息通知</text>
			<view class="header-action" @tap="markAllRead">
				<text class="action-icon iconfont icon-xieru"></text>
				<text class="action-text">一键已读</text>
			</view>
		</view>

		<scroll-view 
			class="page-scroll"
			scroll-y
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@refresherrestore="onRestore"
			@tap="closeAllSwipes"
		>
		<view class="category-list">
			<view 
				class="category-wrapper" 
				v-for="category in sortedCategories" 
				:key="category.type"
			>
				<!-- 滑动操作按钮 (放在前面作为底层) -->
				<view class="swipe-actions">
					<view 
						class="action-btn pin-btn" 
						@tap.stop="togglePin(category)"
					>
						{{ category.isPinned ? '取消置顶' : '置顶' }}
					</view>
					<view 
						class="action-btn delete-btn" 
						@tap.stop="deleteCategory(category)"
					>
						删除
					</view>
				</view>

				<view 
					class="category-item-container"
					@touchstart="onTouchStart($event, category)"
					@touchmove="onTouchMove($event, category)"
					@touchend="onTouchEnd($event, category)"
					:style="{ transform: `translateX(${category.translateX || 0}px)` }"
				>
					<view 
						class="category-item" 
						:class="{ 'is-pinned': category.isPinned }"
						@tap.stop="viewCategoryMessages(category)"
					>
						<view class="category-icon" :class="'type-' + category.type">
							<text v-if="category.iconClass" class="iconfont" :class="category.iconClass"></text>
							<text v-else>{{ category.icon }}</text>
						</view>
						<view class="category-content">
							<view class="category-top">
								<view class="category-title-wrapper">
								<text class="category-title">{{ category.title }}</text>
									<text v-if="category.isPinned" class="pin-icon iconfont icon-huangguan"></text>
								</view>
								<view class="category-right">
									<text v-if="!category.isService && category.lastTime" class="category-time">{{ category.lastTime }}</text>
								</view>
							</view>
							<view class="category-bottom">
								<text class="category-desc">{{ category.lastMessage || category.desc }}</text>
									<view class="category-badge" v-if="category.unreadCount > 0">
									{{ category.unreadCount > 99 ? '99+' : category.unreadCount }}
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { setTabBarBadge, removeTabBarBadge } from '@/utils/tabbar.js'
import { getMessageList, markAsRead, markAllAsRead, getUnreadCount } from '@/api/message.js'
import { getSystemSentences } from '@/api/system.js'
import { getExpiringCoupons } from '@/api/coupon.js'

// 从本地存储加载保存的状态
const loadCategoryStates = () => {
	const saved = uni.getStorageSync('messageCategoryStates')
	return saved || {}
}

// 保存分类状态到本地存储
const saveCategoryStates = () => {
	const states = {}
	messageCategories.value.forEach(cat => {
		states[cat.type] = {
			isPinned: cat.isPinned || false,
			lastTimeStamp: cat.lastTimeStamp || 0
		}
	})
	uni.setStorageSync('messageCategoryStates', states)
}

// 加载已删除的分类
const loadDeletedCategories = () => {
	return uni.getStorageSync('deletedMessageCategories') || []
}

// 消息分类列表
// 消息分类列表
const savedStates = loadCategoryStates()
// 只声明一次 now（在最后使用，但需要在使用前定义，所以放在这里）
const now = Date.now()

let deletedCategories = loadDeletedCategories()   // 改用 let 以便修改
// 清理历史遗留的 coupon_expiring 删除记录
if (deletedCategories.includes('coupon_expiring')) {
    deletedCategories = deletedCategories.filter(t => t !== 'coupon_expiring')
    uni.setStorageSync('deletedMessageCategories', deletedCategories)
}
// 初始化消息分类（排除已删除的）
const initMessageCategories = () => {
	const allCategories = [
	{
		type: 'service',
		title: '联系客服',
		icon: '',
		iconClass: 'icon-kefuxiaoxi',
		desc: '在线客服,随时为您服务',
		unreadCount: 0,
		isService: true,
		isPinned: savedStates['service']?.isPinned || false,
		translateX: 0,
		lastTimeStamp: savedStates['service']?.lastTimeStamp || (now - 2 * 60 * 60 * 1000) // 2小时前
	},
	{
		type: 'system',
		title: '系统通知',
		icon: '',
		iconClass: 'icon-xitongtongzhi',
		desc: '系统公告和重要提醒',
		unreadCount: 0,
		isPinned: savedStates['system']?.isPinned || false,
		translateX: 0,
		lastTimeStamp: savedStates['system']?.lastTimeStamp || (now - 3 * 60 * 60 * 1000) // 3小时前
	}
	]
	
	// 过滤掉已删除的分类
	return allCategories.filter(cat => !deletedCategories.includes(cat.type))
}

const messageCategories = ref(initMessageCategories())

const messageList = ref([])
const refreshing = ref(false)

/**
 * 排序后的消息分类列表
 * 1. 置顶的在前
 * 2. 按最新消息时间倒序排列
 */
const sortedCategories = computed(() => {
	return [...messageCategories.value].sort((a, b) => {
		// 置顶的优先
		if (a.isPinned && !b.isPinned) return -1
		if (!a.isPinned && b.isPinned) return 1
		
		// 都置顶或都不置顶,按时间排序
		const timeA = a.lastTimeStamp || 0
		const timeB = b.lastTimeStamp || 0
		return timeB - timeA
	})
})

// 触摸相关状态
const touchStartX = ref(0)
const touchStartY = ref(0)
const currentSwipeCategory = ref(null)

/**
 * 关闭所有已展开的滑动项
 */
const closeAllSwipes = () => {
	messageCategories.value.forEach(category => {
		category.translateX = 0
	})
	currentSwipeCategory.value = null
}

/**
 * 是否有未读消息
 */
const hasUnread = computed(() => {
	return messageList.value.some(item => !item.read)
})

/**
 * 更新红点数字（消息红点已去掉，仅清除不显示）
 */
const updateTabBarBadge = async () => {
	removeTabBarBadge(2)
}

/**
 * 全部标记为已读
 */
const markAllRead = async () => {
	if (!checkLogin()) {
		return
	}
	try {
		await markAllAsRead()
		messageList.value.forEach(item => {
			item.read = true
		})
		updateCategoryUnreadCount() // 更新分类未读数
		removeTabBarBadge(2)
		uni.showToast({ title: '已全部标记已读', icon: 'success' })
	} catch (error) {
		console.error('标记已读失败', error)
		// 即使接口失败,也更新本地状态
		messageList.value.forEach(item => {
			item.read = true
		})
		updateCategoryUnreadCount() // 更新分类未读数
		removeTabBarBadge(2)
		uni.showToast({ title: '已全部标记已读', icon: 'success' })
	}
}

const getTypeIcon = (type) => {
	const icons = {
		system: '📢',
		order: '📦',
		team: '👥',
		reward: '💰'
	}
	const iconClasses = {
		team: 'icon-tuandui',
		reward: 'icon-tixian'
	}
	return icons[type] || '📢'
}

/**
 * 格式化时间
 */
const formatTime = (datetime) => {
	if (!datetime) return ''
	
	const now = new Date()
	const time = new Date(datetime)
	const diff = now - time
	
	// 1分钟内
	if (diff < 60000) {
		return '刚刚'
	}
	// 1小时内
	if (diff < 3600000) {
		return Math.floor(diff / 60000) + '分钟前'
	}
	// 今天
	if (now.toDateString() === time.toDateString()) {
		return time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0')
	}
	// 昨天
	const yesterday = new Date(now)
	yesterday.setDate(yesterday.getDate() - 1)
	if (yesterday.toDateString() === time.toDateString()) {
		return '昨天'
	}
	// 一周内
	if (diff < 7 * 24 * 3600000) {
		return Math.floor(diff / (24 * 3600000)) + '天前'
	}
	// 更早
	return time.getMonth() + 1 + '-' + time.getDate()
}

/**
 * 触摸开始
 */
const onTouchStart = (e, category) => {
	// 如果触摸的是其他项目,先关闭当前已展开的项目
	if (currentSwipeCategory.value && currentSwipeCategory.value.type !== category.type) {
		closeAllSwipes()
	}
	
	touchStartX.value = e.touches[0].clientX
	touchStartY.value = e.touches[0].clientY
	currentSwipeCategory.value = category
}

/**
 * 触摸移动
 */
const onTouchMove = (e, category) => {
	if (!currentSwipeCategory.value || currentSwipeCategory.value.type !== category.type) return
	
	const touchX = e.touches[0].clientX
	const touchY = e.touches[0].clientY
	const deltaX = touchX - touchStartX.value
	const deltaY = touchY - touchStartY.value
	
	// 判断是否为横向滑动(横向滑动距离大于纵向)
	if (Math.abs(deltaX) > Math.abs(deltaY)) {
		// 只允许向左滑动
		if (deltaX < 0) {
			// 限制最大滑动距离为 140px (两个按钮的宽度)
			category.translateX = Math.max(deltaX, -140)
		} else if (category.translateX < 0) {
			// 如果已经滑开,允许向右滑动关闭
			category.translateX = Math.min(deltaX - 140, 0)
		}
	}
}

/**
 * 触摸结束
 */
const onTouchEnd = (e, category) => {
	if (!currentSwipeCategory.value || currentSwipeCategory.value.type !== category.type) return
	
	// 如果滑动距离超过 60px,则完全展开,否则回弹
	if (category.translateX < -60) {
		category.translateX = -140
	} else {
		category.translateX = 0
	}
	
	currentSwipeCategory.value = null
}

/**
 * 切换置顶状态
 */
const togglePin = async (category) => {
	if (!checkLogin()) {
		return
	}
	// 找到分类在数组中的索引
	const index = messageCategories.value.findIndex(c => c.type === category.type)
	if (index !== -1) {
		// 创建新对象来触发响应式
		const newCategory = { ...messageCategories.value[index] }
		newCategory.isPinned = !newCategory.isPinned
		
		// 替换数组中的对象
		messageCategories.value[index] = newCategory
		
		// 保存状态
		saveCategoryStates()
		
		// 等待下一个渲染周期后关闭菜单
		await nextTick()
		closeAllSwipes()
		
		uni.showToast({
			title: newCategory.isPinned ? '已置顶' : '已取消置顶',
			icon: 'success',
			duration: 1500
		})
	}
}

/**
 * 删除分类(隐藏)
 */
const deleteCategory = async (category) => {
	if (!checkLogin()) {
		return
	}
	uni.showModal({
		title: '确认删除',
		content: `确定要删除"${category.title}"吗?删除后当有新消息时会重新出现。`,
		success: async (res) => {
			if (res.confirm) {
				// 找到并移除该分类
				const index = messageCategories.value.findIndex(c => c.type === category.type)
				if (index > -1) {
					// 标记为已删除（保存到本地存储）
					const deletedCategories = uni.getStorageSync('deletedMessageCategories') || []
					if (!deletedCategories.includes(category.type)) {
						deletedCategories.push(category.type)
						uni.setStorageSync('deletedMessageCategories', deletedCategories)
					}
					
					// 从列表中移除
					messageCategories.value.splice(index, 1)
					
					// 保存状态
					saveCategoryStates()
					
					// 等待下一个渲染周期后关闭菜单
					await nextTick()
					closeAllSwipes()
					
					uni.showToast({
						title: '已删除',
						icon: 'success',
						duration: 1500
					})
				}
			}
		}
	})
}

/**
 * 检查登录状态
 */
const checkLogin = () => {
	const token = uni.getStorageSync('token')
	const userInfo = uni.getStorageSync('userInfo') || {}
	const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
	const mobile = userInfo.mobile || userInfo.phone
	const isLoggedIn = !!(token && (userId || (mobile && /^\d{11}$/.test(mobile))))
	
	if (!isLoggedIn) {
		uni.showToast({
			title: '请先登录',
			icon: 'none'
		})
		setTimeout(() => {
			uni.navigateTo({
				url: '/pages/index/index'
			})
		}, 500)
		return false
	}
	return true
}

/**
 * 查看某类型的消息列表
 */
const viewCategoryMessages = (category) => {
	if (!checkLogin()) {
		return
	}
	// 如果有任何项目处于展开状态,不执行跳转(防止误触)
	const hasOpenSwipe = messageCategories.value.some(cat => cat.translateX < 0)
	if (hasOpenSwipe) {
		closeAllSwipes()
		return
	}
	
	// 如果是客服,跳转到客服页面
	if (category.isService) {
		uni.navigateTo({ url: '/subPackages/page1/pages/service/service' })
		return
	}
	
	if (category.type === 'system') {
	    const systemCat = messageCategories.value.find(c => c.type === 'system')
	    // 如果有过期优惠券（unreadCount > 0），跳转到优惠券列表（可筛选即将过期的）
	    if (systemCat && systemCat.unreadCount > 0) {
	        // 路径请根据你的项目实际优惠券列表页地址修改
	        uni.navigateTo({ 
	            url: '/subPackages/page1/pages/coupon/list?filter=expiring'
	        })
	    } else {
	        // 否则跳转到系统通知列表页
	        uni.navigateTo({ 
	            url: `/subPackages/page1/pages/message/category-list?type=system&title=${encodeURIComponent(category.title)}` 
	        })
	    }
	    return
	}
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * 加载系统通知（包含过期优惠券提醒）
 */
const loadSystemNotice = async () => {
    try {
        // 1. 获取系统句子
        const sysRes = await getSystemSentences()
        const sysData = sysRes.data || sysRes
        let systemSentence = sysData.system_sentence || sysData.systemSentence || ''
        
        // 2. 获取即将过期的优惠券（默认3天）
        let expiringCoupons = []
        let expiringCount = 0
        try {
            const couponRes = await getExpiringCoupons(3)
            const couponData = couponRes.data || couponRes
            expiringCoupons = couponData.data || []
            expiringCount = expiringCoupons.length
        } catch (err) {
            console.error('获取过期优惠券失败', err)
        }
        
        // 3. 构建最终展示内容
        let finalContent = systemSentence.trim()
        if (expiringCount > 0) {
            // 找出最早过期的优惠券
            const earliest = expiringCoupons.sort((a, b) => new Date(a.expire_time) - new Date(b.expire_time))[0]
            const expireMsg = `您有 ${expiringCount} 张优惠券即将过期，最早到期 ${formatDate(earliest.expire_time)}`
            finalContent = finalContent ? `${finalContent}\n\n${expireMsg}` : expireMsg
        } else {
            if (!finalContent) finalContent = '暂无系统通知'
        }
        
        // 4. 更新系统通知分类
        const systemCategory = messageCategories.value.find(cat => cat.type === 'system')
        if (systemCategory) {
            systemCategory.lastMessage = finalContent
            systemCategory.lastTimeStamp = Date.now()
            systemCategory.lastTime = formatTime(new Date())
            // 将过期优惠券数量作为未读数量（也可根据需求调整）
            systemCategory.unreadCount = expiringCount
        }
    } catch (error) {
        console.error('加载系统通知失败', error)
    }
}

/**
 * 加载消息列表并统计未读数（从本地存储）
 */
const loadMessageList = async () => {
	try {
		const res = await getMessageList({ page: 1, pageSize: 50 })
		
		// 将本地数据转换为前端格式
		const messages = (res.data?.list || []).map(msg => ({
			id: msg.id,
			type: msg.type,
			title: msg.title,
			content: msg.content,
			time: msg.time || formatTime(msg.created_at),
			read: msg.read === true || msg.read === 1,
			orderId: msg.orderId || msg.order_id,
			orderNo: msg.orderNo || msg.order_no,
			amount: msg.amount,
			created_at: msg.created_at
		}))
		
		messageList.value = messages
		
		console.log('[消息页面] 从本地存储加载消息，共', messages.length, '条')
	} catch (error) {
		// 如果获取失败，尝试直接从本地存储读取
		console.error('获取消息列表失败，尝试从本地存储读取', error)
		const localMessages = uni.getStorageSync('messageList') || []
		messageList.value = localMessages.map(msg => ({
			id: msg.id,
			type: msg.type,
			title: msg.title,
			content: msg.content,
			time: msg.time || formatTime(msg.created_at),
			read: msg.read === true || msg.read === 1,
			orderId: msg.orderId || msg.order_id,
			orderNo: msg.orderNo || msg.order_no,
			amount: msg.amount,
			created_at: msg.created_at
		}))
	}
	
	// 加载系统通知内容
	await loadSystemNotice()
	
	// 统计每个分类的未读数
	updateCategoryUnreadCount()
}

/**
 * 更新分类未读数和最新消息
 */
const updateCategoryUnreadCount = () => {
	messageCategories.value.forEach(category => {
		// 跳过客服分类
		if (category.isService) {
			return
		}
		
		// 系统通知分类特殊处理：不从本地消息列表获取，使用API数据
		if (category.type === 'system') {
		    // 系统通知的未读数由 loadSystemNotice 管理，这里不处理
		    return
		}
		
		// 统计未读数
		category.unreadCount = messageList.value.filter(
			msg => msg.type === category.type && !msg.read
		).length
		
		// 获取该分类最新的一条消息
		const latestMessage = messageList.value
			.filter(msg => msg.type === category.type)
			.sort((a, b) => {
				// 按时间倒序排序
				const timeA = new Date(a.created_at || a.time).getTime()
				const timeB = new Date(b.created_at || b.time).getTime()
				return timeB - timeA
			})[0]
		
		if (latestMessage) {
			category.lastTime = latestMessage.time
			category.lastMessage = latestMessage.content
			// 保存时间戳用于排序
			category.lastTimeStamp = new Date(latestMessage.created_at || latestMessage.time).getTime()
		}
	})
	
	// 检查是否有新消息，如果有新消息且分类被删除，则恢复显示
	const currentDeletedCategories = loadDeletedCategories()
	const allCategoryTypes = ['service', 'system']
	
	allCategoryTypes.forEach(type => {
		if (currentDeletedCategories.includes(type)) {
			// 检查该类型是否有未读消息
			const hasUnread = messageList.value.some(msg => msg.type === type && !msg.read)
			if (hasUnread) {
				// 如果有未读消息，恢复该分类
				const existingCategory = messageCategories.value.find(c => c.type === type)
				if (!existingCategory) {
					// 创建恢复的分类
					const savedStates = loadCategoryStates()
					const now = Date.now()
					const categoryMap = {
						service: { title: '联系客服', icon: '', iconClass: 'icon-kefuxiaoxi', desc: '在线客服,随时为您服务', isService: true },
						system: { title: '系统通知', icon: '📢', iconClass: '', desc: '系统公告和重要提醒', isService: false }
					}
					
					const categoryInfo = categoryMap[type]
					if (categoryInfo) {
						const restoredCategory = {
							type: type,
							title: categoryInfo.title,
							icon: categoryInfo.icon,
							iconClass: categoryInfo.iconClass,
							desc: categoryInfo.desc,
							unreadCount: 0,
							isService: categoryInfo.isService,
							isPinned: savedStates[type]?.isPinned || false,
							translateX: 0,
							lastTimeStamp: savedStates[type]?.lastTimeStamp || now
						}
						
						// 从删除列表中移除
						const newDeletedList = currentDeletedCategories.filter(t => t !== type)
						uni.setStorageSync('deletedMessageCategories', newDeletedList)
						
						// 添加到列表
						messageCategories.value.push(restoredCategory)
					}
				}
			}
		}
	})
	
	// 保存分类状态
	saveCategoryStates()
}

onLoad(() => {
	loadMessageList()
})

/**
 * 下拉刷新
 */
const onRefresh = async () => {
	refreshing.value = true
	try {
		await loadMessageList()
		await updateTabBarBadge()
		uni.showToast({ title: '刷新成功', icon: 'success', duration: 1000 })
	} catch (error) {
		console.error('刷新失败', error)
		// 不显示错误提示，静默失败
	} finally {
		setTimeout(() => {
			refreshing.value = false
		}, 500)
	}
}

/**
 * 刷新恢复
 */
const onRestore = () => {
	refreshing.value = false
}

onShow(() => {
	// 每次显示时重新加载消息列表(刷新已读状态)
	loadMessageList()
	
	// 根据实际未读数量更新红点
	updateTabBarBadge()
})

onHide(() => {
	// 页面隐藏时关闭所有滑动菜单
	closeAllSwipes()
})

</script>

<style scoped>
.message-page {
	height: 100vh;
	background: #f5f5f5;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.page-scroll {
	flex: 1;
	height: 0;
	overflow-y: auto;
}

.message-header {
	background: #fff;
	padding: 30rpx;
	border-bottom: 1rpx solid #d9d9d9;
	display: flex;
	justify-content: space-between;
	align-items: center;
	flex-shrink: 0;
	z-index: 10;
}

.header-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.header-action {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 10rpx 20rpx;
	background: #f0f0f0;
	border-radius: 30rpx;
}

.header-action:active {
	opacity: 0.7;
}

.action-icon {
	font-size: 28rpx;
	display: inline-block;
	font-family: "iconfont" !important;
}

.action-text {
	font-size: 24rpx;
	color: #666;
}

.category-list {
	padding: 0;
	background: #f5f5f5;
	min-height: 100%;
}

.category-wrapper {
	position: relative;
	margin-bottom: 2rpx;
	overflow: hidden;
	background: #fff;
}

.category-item-container {
	position: relative;
	transition: transform 0.3s ease;
	/* 移除背景色,由子元素控制 */
}

.category-item {
	background: #fff;
	border-radius: 0;
	padding: 20rpx 30rpx;
	display: flex;
	gap: 20rpx;
	position: relative;
	align-items: center;
	overflow: visible;
	transition: background-color 0.2s;
	border-bottom: 1rpx solid #f0f0f0;
}

.category-item:active {
	background-color: #f5f5f5;
}

.category-item.is-pinned {
	/* 移除背景色变化，保持原色 */
}

.swipe-actions {
	position: absolute;
	right: 0;
	top: 0;
	height: 100%; /* 确保高度一致 */
	display: flex;
	border-bottom: 1rpx solid transparent; /* 占位,保持高度一致 */
}

.action-btn {
	width: 140rpx;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 28rpx;
	font-weight: bold;
}

.pin-btn {
	background: #ff9800;
	width: 140rpx;
}

.delete-btn {
	background: #f44336;
	width: 140rpx;
}

.category-icon {
	width: 96rpx;
	height: 96rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 44rpx;
	flex-shrink: 0;
	overflow: hidden;
}

.category-icon .iconfont {
	font-size: 44rpx;
	color: #333;
	display: inline-block;
	font-family: "iconfont" !important;
	font-style: normal;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
}

.type-system {
	background: linear-gradient(135deg, #e3f2fd, #bbdefb);
}

.type-system .iconfont {
	color: #1976d2;
}

.type-order {
	background: linear-gradient(135deg, #fff3e0, #ffe0b2);
}

.type-order .iconfont {
	color: #f57c00;
}

.type-team {
	background: linear-gradient(135deg, #f3e5f5, #e1bee7);
}

.type-team .iconfont {
	color: #7b1fa2;
}

.type-reward {
	background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
}

.type-reward .iconfont {
	color: #388e3c;
}

.type-service {
	background: linear-gradient(135deg, #667eea, #764ba2);
}

.type-service .iconfont {
	color: white;
}

.category-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	min-width: 0;
	overflow: hidden;
}

.category-bottom {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12rpx;
}

.category-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 20rpx;
	min-width: 0;
}

.category-title-wrapper {
	display: flex;
	align-items: center;
	gap: 8rpx;
	flex-shrink: 0;
}

.category-title {
	font-size: 30rpx;
	font-weight: 500;
	color: #333;
	flex-shrink: 0;
}

.pin-icon {
	font-size: 22rpx;
	color: #ff9800;
	flex-shrink: 0;
	margin-left: 4rpx;
}

.category-right {
	display: flex;
	align-items: center;
	gap: 12rpx;
	flex-shrink: 0;
}

.category-time {
	font-size: 22rpx;
	color: #999;
	flex-shrink: 0;
}

.category-desc {
	font-size: 26rpx;
	color: #999;
	line-height: 1.4;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
	min-width: 0;
}

.category-badge {
	min-width: 32rpx;
	height: 32rpx;
	background: #ff5252;
	color: #fff;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20rpx;
	padding: 0 10rpx;
	font-weight: bold;
	flex-shrink: 0;
	line-height: 1;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	padding: 120rpx 0;
}

.empty-icon {
	font-size: 120rpx;
	opacity: 0.3;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}
</style>

<style>
@import "@/static/999/iconfont.css";
</style>
