/**
 * 动态切换tabbar配置
 */

// 用户模式tabbar配置
export const userTabBar = {
  color: "#999999",
  selectedColor: "#3d6bff",
  backgroundColor: "#ffffff",
  borderStyle: "black",
  list: [
    {
      pagePath: "pages/home/home",
      text: "首页",
      iconPath: "/static/tabbar/shouye.png",
      selectedIconPath: "/static/tabbar/shouye.png"
    },
    {
      pagePath: "pages/team/team",
      text: "团队",
      iconPath: "/static/tabbar/tuandui.png",
      selectedIconPath: "/static/tabbar/tuandui.png"
    },
    {
      pagePath: "pages/message/message",
      text: "通知",
      iconPath: "/static/tabbar/tongzhi.png",
      selectedIconPath: "/static/tabbar/tongzhi.png"
    },
    {
      pagePath: "pages/user/user",
      text: "我的",
      iconPath: "/static/tabbar/wode.png",
      selectedIconPath: "/static/tabbar/wode.png"
    }
  ]
}

// 平台模式tabbar配置（is_merchant=2）
export const merchantTabBar = {
  color: "#999999",
  selectedColor: "#ff9800",
  backgroundColor: "#ffffff",
  borderStyle: "black",
  list: [
    {
      pagePath: "pages/merchant/center",
      text: "商家中心",
      iconPath: "/static/tabbar/merchant.png",
      selectedIconPath: "/static/tabbar/merchant.png"
    },
    {
      pagePath: "pages/merchant/products",
      text: "商品管理",
      iconPath: "/static/tabbar/products.png",
      selectedIconPath: "/static/tabbar/products.png"
    },
    {
      pagePath: "pages/merchant/orders",
      text: "订单管理",
      iconPath: "/static/tabbar/orders.png",
      selectedIconPath: "/static/tabbar/orders.png"
    },
    {
      pagePath: "pages/merchant/sales",
      text: "销售统计",
      iconPath: "/static/tabbar/sales.png",
      selectedIconPath: "/static/tabbar/sales.png"
    }
  ]
}

// 商家模式tabbar配置（is_merchant=1）
export const shopTabBar = {
  color: "#999999",
  selectedColor: "#4caf50",
  backgroundColor: "#ffffff",
  borderStyle: "black",
  list: [
    {
      pagePath: "subPackages/page2/pages/shop/center",
      text: "商家中心",
      iconPath: "/static/tabbar/merchant.png",
      selectedIconPath: "/static/tabbar/merchant.png"
    },
    {
      pagePath: "subPackages/page2/pages/shop/products",
      text: "商品管理",
      iconPath: "/static/tabbar/products.png",
      selectedIconPath: "/static/tabbar/products.png"
    },
    {
      pagePath: "subPackages/page2/pages/shop/orders",
      text: "订单管理",
      iconPath: "/static/tabbar/orders.png",
      selectedIconPath: "/static/tabbar/orders.png"
    },
    {
      pagePath: "subPackages/page2/pages/shop/inventory",
      text: "库存管理",
      iconPath: "/static/tabbar/products.png",
      selectedIconPath: "/static/tabbar/products.png"
    }
  ]
}

/**
 * 切换到用户模式
 */
export const switchToUserMode = () => {
  uni.setStorageSync('userMode', 'user')
  uni.setStorageSync('skip_auto_shop_redirect', '1') // 用户主动切到用户模式，本次会话内首页不再自动跳回商家
  // 重新启动应用以应用新的tabbar配置，跳到「我的」页
  uni.reLaunch({
    url: '/pages/user/user'
  })
}

/**
 * 切换到平台模式（is_merchant=2）
 */
export const switchToMerchantMode = () => {
  uni.setStorageSync('userMode', 'merchant')
  // 重新启动应用以应用新的tabbar配置
  uni.reLaunch({
    url: '/subPackages/page2/pages/merchant/center'
  })
}

/**
 * 切换到商家模式（is_merchant=1）
 */
export const switchToShopMode = () => {
  uni.setStorageSync('userMode', 'shop')
  // 重新启动应用以应用新的tabbar配置
  uni.reLaunch({
    url: '/subPackages/page2/pages/shop/center'
  })
}

/**
 * 获取当前用户模式
 */
export const getCurrentMode = () => {
  return uni.getStorageSync('userMode') || 'user'
}

/**
 * 检查是否为平台模式
 */
export const isMerchantMode = () => {
  return getCurrentMode() === 'merchant'
}

/**
 * 检查是否为商家模式
 */
export const isShopMode = () => {
  return getCurrentMode() === 'shop'
}

/**
 * 检查当前页面是否为TabBar页面
 */
const isTabBarPage = () => {
  try {
    // 使用 uni.getCurrentPages() 或 getCurrentPages()（取决于环境）
    const getPages = typeof uni !== 'undefined' && uni.getCurrentPages ? uni.getCurrentPages : (typeof getCurrentPages !== 'undefined' ? getCurrentPages : null)
    if (!getPages) return false
    
    const pages = getPages()
    if (pages.length === 0) return false
    
    const currentPage = pages[pages.length - 1]
    const route = currentPage.route || ''
    
    // TabBar页面路径列表
    const tabBarPages = [
      'pages/home/home',
      'pages/team/team',
      'pages/message/message',
      'pages/user/user',
      'pages/merchant/center',
      'pages/merchant/products',
      'pages/merchant/orders',
      'pages/merchant/sales',
      'subPackages/page2/pages/shop/center',
      'subPackages/page2/pages/shop/products',
      'subPackages/page2/pages/shop/orders',
      'subPackages/page2/pages/shop/inventory'
    ]
    
    return tabBarPages.some(page => route.includes(page))
  } catch (error) {
    return false
  }
}

/**
 * 设置tabbar徽标（红点数字）
 * @param {Number} index tabbar索引（0-3）
 * @param {Number} count 未读数量
 */
export const setTabBarBadge = (index, count) => {
  // 只在TabBar页面设置徽标，避免在非TabBar页面报错
  if (!isTabBarPage()) {
    return
  }
  
  try {
    if (count > 0) {
      uni.setTabBarBadge({
        index: index,
        text: count > 99 ? '99+' : count.toString(),
        fail: (err) => {
          // 静默处理错误，不输出到控制台
          if (err.errMsg && !err.errMsg.includes('not TabBar page')) {
            console.warn('[TabBar] 设置徽标失败:', err)
          }
        }
      })
    } else {
      removeTabBarBadge(index)
    }
  } catch (error) {
    // 静默处理错误
  }
}

/**
 * 移除tabbar徽标
 * @param {Number} index tabbar索引（0-3）
 */
export const removeTabBarBadge = (index) => {
  // 只在TabBar页面移除徽标，避免在非TabBar页面报错
  if (!isTabBarPage()) {
    return
  }
  
  try {
    uni.removeTabBarBadge({
      index: index,
      fail: (err) => {
        // 静默处理错误，不输出到控制台
        if (err.errMsg && !err.errMsg.includes('not TabBar page')) {
          console.warn('[TabBar] 移除徽标失败:', err)
        }
      }
    })
  } catch (error) {
    // 静默处理错误
  }
}

/**
 * 显示tabbar红点
 * @param {Number} index tabbar索引（0-3）
 */
export const showTabBarRedDot = (index) => {
  uni.showTabBarRedDot({
    index: index
  })
}

/**
 * 隐藏tabbar红点
 * @param {Number} index tabbar索引（0-3）
 */
export const hideTabBarRedDot = (index) => {
  uni.hideTabBarRedDot({
    index: index
  })
}