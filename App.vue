<script>
	import { savePendingReferrer } from '@/utils/referral.js'
	import { initProducts } from '@/utils/product.js'
	import { confirmReceive } from '@/api/order.js'

	export default {
		onLaunch(options) {
			// App Launch
			// 冷启动时清除「跳过自动进商家」标志，使商家用户下次打开时仍默认进商家中心
			try {
				uni.removeStorageSync('skip_auto_shop_redirect')
			} catch (e) { /* ignore */ }

			// ========== 打印扫码内容 ==========
			console.log('========== [App启动] 扫码进入 - 完整参数信息 ==========')
			console.log('📋 [App启动] options 完整对象:', JSON.stringify(options, null, 2))
			console.log('📋 [App启动] options 原始对象:', options)
			console.log('📋 [App启动] options.scene:', options?.scene)
			console.log('📋 [App启动] options.query:', options?.query)
			console.log('📋 [App启动] options.path:', options?.path)
			console.log('📋 [App启动] options.shareTicket:', options?.shareTicket)
			
			// 打印所有 options 中的键值对
			if (options) {
				console.log('📋 [App启动] options 所有键:', Object.keys(options))
				Object.keys(options).forEach(key => {
					console.log(`📋 [App启动] options.${key}:`, options[key], `(类型: ${typeof options[key]})`)
				})
			}
			
			// 如果存在 scene 参数，打印详细信息
			if (options?.scene) {
				console.log('📋 [App启动] scene 原始值:', options.scene)
				try {
					const decoded = decodeURIComponent(options.scene)
					console.log('📋 [App启动] scene 解码后:', decoded)
					// 解析 scene 参数
					const sceneParams = {}
					decoded.split('&').forEach((pair) => {
						if (pair) {
							const equalIndex = pair.indexOf('=')
							if (equalIndex !== -1) {
								const k = pair.substring(0, equalIndex).trim()
								const v = pair.substring(equalIndex + 1).trim()
								sceneParams[k] = v
							}
						}
					})
					console.log('📋 [App启动] scene 解析后的参数对象:', sceneParams)
				} catch (e) {
					console.error('❌ [App启动] scene 解码失败:', e)
				}
			}
			
			// 打印 query 中的所有参数
			if (options?.query) {
				console.log('📋 [App启动] query 所有参数:', options.query)
				Object.keys(options.query).forEach(key => {
					console.log(`📋 [App启动] query.${key}:`, options.query[key])
				})
			}
			
			console.log('========== [App启动] 扫码内容打印结束 ==========')
			// ========== 打印扫码内容结束 ==========

			// 初始化商品数据(确保有基础数据)
			// 使用 try-catch 包裹，避免初始化失败阻止应用启动
			try {
				initProducts().catch(err => {
					console.warn('[App启动] 商品数据初始化失败，但不影响应用启动:', err)
				})
			} catch (err) {
				console.warn('[App启动] 商品数据初始化异常，但不影响应用启动:', err)
			}

			// 统一解析启动参数中的推荐信息（扫码 / 分享等进入）
			const query = (options && options.query) || {}
			// 支持多种方式获取 scene：
			// 1. options.scene（uni-app 标准）
			// 2. options.query.scene
			// 3. 如果启动参数是 JSON 字符串，尝试解析
			let scene = options.scene || query.scene || ''
			
			// 如果 scene 是 JSON 字符串格式（如 "scene": "o=OFF20250624153008a3f2c1&r=4GDY57"），需要解析
			if (!scene && options && typeof options === 'object') {
				// 尝试从 options 中直接获取 scene（可能是字符串格式）
				if (options.scene && typeof options.scene === 'string') {
					scene = options.scene
				}
				// 尝试从 query 中获取
				if (!scene && query.scene) {
					scene = query.scene
				}
			}
			

			// 1) 直接 query 方式携带
			const referrerId = query.referrerId || query.referrer_id || ''
			const referralCode = query.referralCode || query.inviteCode || query.referral_code || ''

			// 2) scene 编码方式（如 "referrerId=123&referralCode=ABC123" 或 "o=OFF20250624153008a3f2c1&r=4GDY57"）
			// 也支持 scene 直接是推荐码字符串（如 "4GDY57"）
			let sceneReferrerId = ''
			let sceneReferralCode = ''
			if (scene) {
				try {
					// 先尝试解码（如果被编码了）
					let decoded = scene
					try {
						decoded = decodeURIComponent(scene)
					} catch (e) {
						// 如果解码失败，直接使用原始值
						decoded = scene
					}
					
					// 检查是否包含 key=value 格式（包含 = 符号）
					if (decoded.includes('=')) {
						// 按 & 分割参数，解析 key=value 格式
						decoded.split('&').forEach((pair) => {
							if (!pair) return
							const equalIndex = pair.indexOf('=')
							if (equalIndex === -1) return
							
							const k = pair.substring(0, equalIndex).trim()
							let v = pair.substring(equalIndex + 1).trim()
							// 清理值：去除可能的引号和转义字符
							v = v.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
							
							if (k === 'referrerId' || k === 'referrer_id') {
								sceneReferrerId = v
							}
							if (k === 'referralCode' || k === 'inviteCode') {
								sceneReferralCode = v
							}
							// 支持 r 参数作为推荐码（如 "o=OFF20250624153008a3f2c1&r=UYAZKK"）
							if (k === 'r' && v) {
								sceneReferralCode = v
							}
						})
					} else {
						// 如果 scene 是纯字符串（没有 = 符号），直接作为推荐码
						// 清理值：去除可能的引号和转义字符
						const cleanCode = decoded.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
						if (cleanCode) {
							sceneReferralCode = cleanCode
							console.log('✅ [App启动] scene 是纯字符串，直接作为推荐码:', sceneReferralCode)
						}
					}
				} catch (e) {
					console.error('❌ [App启动] 解析 scene 失败', e, '原始 scene 值:', scene)
				}
			}

			const finalReferrerId = referrerId || sceneReferrerId
			const finalReferralCode = referralCode || sceneReferralCode
			if (finalReferrerId || finalReferralCode) {
				savePendingReferrer({
					referrerId: finalReferrerId,
					referralCode: finalReferralCode,
					source: finalReferrerId ? 'qrcode' : 'code'
				})
				console.log('✅ [App启动] 推荐信息已保存')
			}
		},
		onShow(options) {
			// 微信确认收货组件回调（2026 流程）：组件通过 wx.navigateBackMiniProgram 返回，参数在 options.referrerInfo
			// appId 固定为 wx1183b055aeec94d1，extraData: { status, errormsg, req_extradata }
			let refInfo = (options && options.referrerInfo) || null
			if (!refInfo && typeof uni.getEnterOptionsSync === 'function') {
				try {
					const enter = uni.getEnterOptionsSync()
					refInfo = (enter && enter.referrerInfo) || null
				} catch (e) {
					// ignore
				}
			}
			const appId = refInfo && (refInfo.appId || refInfo.appid)
			if (appId === 'wx1183b055aeec94d1') {
				const extraData = refInfo.extraData || {}
				const { status, errormsg, req_extradata } = extraData
				const req = req_extradata || {}
				const orderNo = req.merchant_trade_no || req.transaction_id
				const transactionId = req.transaction_id || null
				console.log('[App.onShow] 确认收货组件回调', { status, orderNo, transactionId })
				if (status === 'success' && orderNo) {
					uni.removeStorageSync('pending_confirm_receive')
					// 传 transaction_id 便于后端做微信订单发货状态二次校验
					confirmReceive({ order_number: orderNo, transaction_id: transactionId }).then(() => {
						uni.showToast({ title: '收货已同步', icon: 'success' })
					}).catch((err) => {
						console.warn('[App.onShow] 确认收货同步失败', err)
						uni.showToast({ title: (err && (err.message || err.msg)) || '同步失败', icon: 'none' })
					})
					return
				}
				if (status === 'fail') {
					console.error('[App.onShow] 确认收货失败', errormsg)
				}
			}

			// App Show - 小程序从后台切回前台时也会触发，可能携带新的 scene 参数
			if (options) {
				const query = (options && options.query) || {}
				const scene = options.scene || query.scene || ''
				
				if (scene) {
					try {
						let decoded = scene
						try {
							decoded = decodeURIComponent(scene)
						} catch (e) {
							decoded = scene
						}
						
						let sceneReferrerId = ''
						let sceneReferralCode = ''
						
						// 检查是否包含 key=value 格式（包含 = 符号）
						if (decoded.includes('=')) {
							// 按 & 分割参数，解析 key=value 格式
							decoded.split('&').forEach((pair) => {
								if (!pair) return
								const equalIndex = pair.indexOf('=')
								if (equalIndex === -1) return
								const k = pair.substring(0, equalIndex).trim()
								let v = pair.substring(equalIndex + 1).trim()
								v = v.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
								if (k === 'referrerId' || k === 'referrer_id') sceneReferrerId = v
								if (k === 'referralCode' || k === 'inviteCode') sceneReferralCode = v
								if (k === 'r' && v) {
									sceneReferralCode = v
								}
							})
						} else {
							// 如果 scene 是纯字符串（没有 = 符号），直接作为推荐码
							const cleanCode = decoded.replace(/^["']|["']$/g, '').replace(/\\/g, '').trim()
							if (cleanCode) {
								sceneReferralCode = cleanCode
								console.log('✅ [App显示] scene 是纯字符串，直接作为推荐码:', sceneReferralCode)
							}
						}
						
						if (sceneReferrerId || sceneReferralCode) {
							savePendingReferrer({
								referrerId: sceneReferrerId,
								referralCode: sceneReferralCode,
								source: sceneReferrerId ? 'qrcode' : 'code'
							})
						}
					} catch (e) {
						console.error('[App显示] 解析 scene 失败', e)
					}
				}
			}
		},
		onHide() {
			// App Hide
		}
	}
</script>

<style>
	/*每个页面公共css */
	
	/* 每个页面文件都会单独导入 iconfont.css，这里不再全局导入 */

</style>
