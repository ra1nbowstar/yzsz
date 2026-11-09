/**
 * 本地存储工具 - 基于用户ID的数据隔离
 * 确保不同用户之间的本地数据不会互相干扰
 */

/**
 * 获取当前用户ID
 * @returns {String|null} 用户ID，如果未登录返回null
 */
const getCurrentUserId = () => {
	try {
		const userInfo = uni.getStorageSync('userInfo') || {}
		// 尝试多种可能的用户ID字段
		const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		// 如果没有user_id，尝试使用手机号作为标识
		const mobile = userInfo.mobile || userInfo.phone
		
		if (userId) {
			return String(userId)
		}
		if (mobile && /^\d{11}$/.test(mobile)) {
			return `mobile_${mobile}`
		}
		return null
	} catch (error) {
		console.error('[存储工具] 获取用户ID失败:', error)
		return null
	}
}

/**
 * 生成带用户ID前缀的存储key
 * @param {String} key 原始key
 * @param {Boolean} isGlobal 是否为全局数据（不隔离），如商品列表、系统配置等
 * @returns {String} 带用户ID前缀的key
 */
const getStorageKey = (key, isGlobal = false) => {
	if (isGlobal) {
		// 全局数据，不加用户ID前缀
		return key
	}
	
	const userId = getCurrentUserId()
	if (!userId) {
		// 未登录时，使用临时key（带temp_前缀）
		return `temp_${key}`
	}
	
	// 已登录时，使用用户ID作为前缀
	return `user_${userId}_${key}`
}

/**
 * 获取存储值
 * @param {String} key 存储key
 * @param {Boolean} isGlobal 是否为全局数据
 * @returns {*} 存储的值，不存在返回null
 */
export const getStorage = (key, isGlobal = false) => {
	try {
		const storageKey = getStorageKey(key, isGlobal)
		const value = uni.getStorageSync(storageKey)
		return value !== '' ? value : null
	} catch (error) {
		console.error(`[存储工具] 获取存储失败 [${key}]:`, error)
		return null
	}
}

/**
 * 设置存储值
 * @param {String} key 存储key
 * @param {*} value 要存储的值
 * @param {Boolean} isGlobal 是否为全局数据
 */
export const setStorage = (key, value, isGlobal = false) => {
	try {
		const storageKey = getStorageKey(key, isGlobal)
		uni.setStorageSync(storageKey, value)
	} catch (error) {
		console.error(`[存储工具] 设置存储失败 [${key}]:`, error)
	}
}

/**
 * 删除存储值
 * @param {String} key 存储key
 * @param {Boolean} isGlobal 是否为全局数据
 */
export const removeStorage = (key, isGlobal = false) => {
	try {
		const storageKey = getStorageKey(key, isGlobal)
		uni.removeStorageSync(storageKey)
	} catch (error) {
		console.error(`[存储工具] 删除存储失败 [${key}]:`, error)
	}
}

/**
 * 清除当前用户的所有本地数据（保留全局数据）
 * 在用户切换账号时调用
 */
export const clearCurrentUserData = () => {
	try {
		const userId = getCurrentUserId()
		if (!userId) {
			console.warn('[存储工具] 未登录，无法清除用户数据')
			return
		}
		
		const prefix = `user_${userId}_`
		const allKeys = []
		
		// 获取所有存储的key（uni-app没有直接获取所有key的方法，需要手动维护）
		// 这里列出所有可能使用的key
		const userDataKeys = [
			'addressList',
			'cart',
			'favorites',
			'coupons',
			'points',
			'orders',
			'messages',
			'team',
			'reward',
			'withdraw',
			'inviteCode',
			'loginTime',
			'keepLogin',
			'lastAddress',
			'selectedAddress',
			'searchHistory',
			'viewHistory',
			'merchantData',
			'pointsLog',
			'financeFlow',
			'subsidy',
			'fundsAllocation',
			'ollama_base_url',
			'ollama_model'
		]
		
		// 清除所有用户相关的数据
		userDataKeys.forEach(key => {
			const storageKey = `${prefix}${key}`
			try {
				uni.removeStorageSync(storageKey)
				allKeys.push(storageKey)
			} catch (e) {
				// 忽略不存在的key
			}
		})
		
		// 也清除旧格式的数据（兼容性处理）
		userDataKeys.forEach(key => {
			try {
				uni.removeStorageSync(key)
			} catch (e) {
				// 忽略不存在的key
			}
		})
		
		console.log(`[存储工具] 已清除用户 ${userId} 的数据，共 ${allKeys.length} 个key`)
	} catch (error) {
		console.error('[存储工具] 清除用户数据失败:', error)
	}
}

/**
 * 清除所有本地数据（包括全局数据）
 * 在用户退出登录时调用
 * 优化：只清除已知的key，不循环所有可能的用户ID，提高性能
 */
export const clearAllStorage = () => {
	try {
		// 清除所有可能的存储key（基础key）
		// 注意：系统配置数据（如播报、系统通知）不应该被清除
		const allKeys = [
			// 用户数据
			'userInfo',
			'token',
			'wechatInfo',
			'needCompleteProfile', // 方案3：需完善资料标记，退出时清除
			'profileSetupPrompted', // 完善资料引导已提示标记（本次安装只提示一次）
			'addressList',
			'cart',
			'favorites',
			'coupons',
			'points',
			'orders',
			'messages',
			'team',
			'reward',
			'withdraw',
			'inviteCode',
			'loginTime',
			'keepLogin',
			'lastAddress',
			'selectedAddress',
			'searchHistory',
			'viewHistory',
			'merchantData',
			'pointsLog',
			'financeFlow',
			'subsidy',
			'fundsAllocation',
			'ollama_base_url',
			'ollama_model',
			// 全局数据（可选，根据需要决定是否清除）
			// 'allProducts', // 商品列表通常是全局的，可以不清除
			// 'charityNotice', // 播报管理 - 系统配置，不应该清除
			// 'charityNotices', // 播报列表 - 系统配置，不应该清除
			// 'systemNotice', // 系统通知 - 系统配置，不应该清除
		]
		
		// 快速清除基础key
		allKeys.forEach(key => {
			try {
				uni.removeStorageSync(key)
			} catch (e) {
				// 忽略不存在的key
			}
		})
		
		// 获取当前用户ID，只清除当前用户的数据（如果有）
		const userInfo = uni.getStorageSync('userInfo') || {}
		const userId = userInfo.user_id || userInfo.id || userInfo.userId || userInfo.uid
		const mobile = userInfo.mobile || userInfo.phone
		
		// 只清除当前用户的数据，不循环所有可能的用户ID
		if (userId) {
			const userPrefix = `user_${userId}_`
			allKeys.forEach(key => {
				try {
					uni.removeStorageSync(`${userPrefix}${key}`)
				} catch (e) {}
			})
		}
		
		// 如果有手机号，也清除 mobile_ 前缀的数据
		if (mobile && /^\d{11}$/.test(mobile)) {
			const mobilePrefix = `mobile_${mobile}_`
			allKeys.forEach(key => {
				try {
					uni.removeStorageSync(`${mobilePrefix}${key}`)
				} catch (e) {}
			})
		}
		
		// 清除临时数据
		allKeys.forEach(key => {
			try {
				uni.removeStorageSync(`temp_${key}`)
			} catch (e) {}
		})
		
		console.log('[存储工具] 已清除所有本地数据')
	} catch (error) {
		console.error('[存储工具] 清除所有数据失败:', error)
	}
}

/**
 * 在用户登录时调用，清除旧用户数据并准备新用户数据
 * @param {Object} newUserInfo 新用户信息
 */
export const onUserLogin = (newUserInfo) => {
	try {
		console.log('[存储工具] 用户登录，准备清除旧数据')
		
		// 获取新用户ID
		const newUserId = newUserInfo?.user_id || newUserInfo?.id || newUserInfo?.userId || newUserInfo?.uid
		const newMobile = newUserInfo?.mobile || newUserInfo?.phone
		const newUserKey = newUserId ? String(newUserId) : (newMobile && /^\d{11}$/.test(newMobile) ? `mobile_${newMobile}` : null)
		
		if (!newUserKey) {
			console.warn('[存储工具] 新用户信息不完整，无法确定用户ID')
			return
		}
		
		// 获取当前存储的用户ID（可能是旧用户）
		const oldUserInfo = uni.getStorageSync('userInfo') || {}
		const oldUserId = oldUserInfo?.user_id || oldUserInfo?.id || oldUserInfo?.userId || oldUserInfo?.uid
		const oldMobile = oldUserInfo?.mobile || oldUserInfo?.phone
		const oldUserKey = oldUserId ? String(oldUserId) : (oldMobile && /^\d{11}$/.test(oldMobile) ? `mobile_${oldMobile}` : null)
		
		// 如果是同一个用户，不清除数据
		if (oldUserKey && oldUserKey === newUserKey) {
			console.log('[存储工具] 同一用户登录，不清除数据')
			return
		}
		
		// 清除旧用户的所有数据
		if (oldUserKey) {
			console.log(`[存储工具] 检测到用户切换：${oldUserKey} -> ${newUserKey}，清除旧用户数据`)
			clearCurrentUserData()
		}
		
		// 清除所有旧格式的数据（兼容性处理）
		const oldFormatKeys = [
			'addressList',
			'cart',
			'favorites',
			'coupons',
			'selectedAddress',
			'lastAddress'
		]
		oldFormatKeys.forEach(key => {
			try {
				uni.removeStorageSync(key)
			} catch (e) {}
		})
		
		console.log('[存储工具] 用户登录处理完成')
	} catch (error) {
		console.error('[存储工具] 用户登录处理失败:', error)
	}
}

/**
 * 在用户退出登录时调用
 */
export const onUserLogout = () => {
	try {
		console.log('[存储工具] 用户退出登录，清除所有数据')
		clearAllStorage()
	} catch (error) {
		console.error('[存储工具] 用户退出登录处理失败:', error)
	}
}

/**
 * 兼容旧API：直接使用uni.getStorageSync/setStorageSync/removeStorageSync
 * 但会自动添加用户ID前缀（除了全局数据）
 * 
 * 使用示例：
 * import { getStorage, setStorage, removeStorage } from '@/utils/storage.js'
 * 
 * // 用户数据（自动隔离）
 * const addressList = getStorage('addressList')
 * setStorage('addressList', data)
 * removeStorage('addressList')
 * 
 * // 全局数据（不隔离）
 * const products = getStorage('allProducts', true)
 * setStorage('allProducts', data, true)
 */
