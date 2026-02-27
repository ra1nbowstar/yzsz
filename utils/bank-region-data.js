/**
 * 银行卡绑定用：常用银行列表、省市区（6位地区编码）
 * 供 WxSubMerchant 等组件使用选择器，减少手填错误
 */

/** 常用开户银行（与微信支付进件常用名称一致） */
export const BANK_LIST = [
  '中国工商银行',
  '中国农业银行',
  '中国银行',
  '中国建设银行',
  '交通银行',
  '招商银行',
  '中国邮政储蓄银行',
  '中信银行',
  '中国光大银行',
  '华夏银行',
  '中国民生银行',
  '广发银行',
  '平安银行',
  '兴业银行',
  '浦发银行',
  '浙商银行',
  '渤海银行',
  '恒丰银行',
  '北京银行',
  '上海银行',
  '江苏银行',
  '宁波银行',
  '南京银行',
  '杭州银行',
  '山西省农村信用社',
  '晋商银行',
  '北京农商银行',
  '上海农商银行',
  '广州银行',
  '其他银行'
]

/**
 * 省市区三级数据（简化版，覆盖常用地区；编码为国标 6 位，区/县编码即 bank_address_code）
 * 结构：省 { name, code: 2位 } -> 市 { name, code: 4位 } -> 区 { name, code: 6位 }
 */
const PROVINCES = [
  { name: '北京市', code: '11' },
  { name: '天津市', code: '12' },
  { name: '河北省', code: '13' },
  { name: '山西省', code: '14' },
  { name: '内蒙古自治区', code: '15' },
  { name: '辽宁省', code: '21' },
  { name: '吉林省', code: '22' },
  { name: '黑龙江省', code: '23' },
  { name: '上海市', code: '31' },
  { name: '江苏省', code: '32' },
  { name: '浙江省', code: '33' },
  { name: '安徽省', code: '34' },
  { name: '福建省', code: '35' },
  { name: '江西省', code: '36' },
  { name: '山东省', code: '37' },
  { name: '河南省', code: '41' },
  { name: '湖北省', code: '42' },
  { name: '湖南省', code: '43' },
  { name: '广东省', code: '44' },
  { name: '广西壮族自治区', code: '45' },
  { name: '海南省', code: '46' },
  { name: '重庆市', code: '50' },
  { name: '四川省', code: '51' },
  { name: '贵州省', code: '52' },
  { name: '云南省', code: '53' },
  { name: '西藏自治区', code: '54' },
  { name: '陕西省', code: '61' },
  { name: '甘肃省', code: '62' },
  { name: '青海省', code: '63' },
  { name: '宁夏回族自治区', code: '64' },
  { name: '新疆维吾尔自治区', code: '65' }
]

// 市：按省 code 前2位分组
const CITIES_BY_PROV = {
  '11': [{ name: '北京市', code: '1101' }],
  '12': [{ name: '天津市', code: '1201' }],
  '13': [
    { name: '石家庄市', code: '1301' }, { name: '唐山市', code: '1302' }, { name: '秦皇岛市', code: '1303' },
    { name: '邯郸市', code: '1304' }, { name: '邢台市', code: '1305' }, { name: '保定市', code: '1306' },
    { name: '张家口市', code: '1307' }, { name: '承德市', code: '1308' }, { name: '沧州市', code: '1309' },
    { name: '廊坊市', code: '1310' }, { name: '衡水市', code: '1311' }
  ],
  '14': [
    { name: '太原市', code: '1401' }, { name: '大同市', code: '1402' }, { name: '阳泉市', code: '1403' },
    { name: '长治市', code: '1404' }, { name: '晋城市', code: '1405' }, { name: '朔州市', code: '1406' },
    { name: '晋中市', code: '1407' }, { name: '运城市', code: '1408' }, { name: '忻州市', code: '1409' },
    { name: '临汾市', code: '1410' }, { name: '吕梁市', code: '1411' }
  ],
  '15': [{ name: '呼和浩特市', code: '1501' }, { name: '包头市', code: '1502' }],
  '21': [{ name: '沈阳市', code: '2101' }, { name: '大连市', code: '2102' }],
  '22': [{ name: '长春市', code: '2201' }],
  '23': [{ name: '哈尔滨市', code: '2301' }],
  '31': [{ name: '上海市', code: '3101' }],
  '32': [
    { name: '南京市', code: '3201' }, { name: '无锡市', code: '3202' }, { name: '徐州市', code: '3203' },
    { name: '常州市', code: '3204' }, { name: '苏州市', code: '3205' }, { name: '南通市', code: '3206' },
    { name: '连云港市', code: '3207' }, { name: '淮安市', code: '3208' }, { name: '盐城市', code: '3209' },
    { name: '扬州市', code: '3210' }, { name: '镇江市', code: '3211' }, { name: '泰州市', code: '3212' },
    { name: '宿迁市', code: '3213' }
  ],
  '33': [
    { name: '杭州市', code: '3301' }, { name: '宁波市', code: '3302' }, { name: '温州市', code: '3303' },
    { name: '嘉兴市', code: '3304' }, { name: '湖州市', code: '3305' }, { name: '绍兴市', code: '3306' },
    { name: '金华市', code: '3307' }, { name: '衢州市', code: '3308' }, { name: '舟山市', code: '3309' },
    { name: '台州市', code: '3310' }, { name: '丽水市', code: '3311' }
  ],
  '34': [{ name: '合肥市', code: '3401' }, { name: '芜湖市', code: '3402' }],
  '35': [{ name: '福州市', code: '3501' }, { name: '厦门市', code: '3502' }, { name: '泉州市', code: '3505' }],
  '36': [{ name: '南昌市', code: '3601' }],
  '37': [
    { name: '济南市', code: '3701' }, { name: '青岛市', code: '3702' }, { name: '淄博市', code: '3703' },
    { name: '枣庄市', code: '3704' }, { name: '东营市', code: '3705' }, { name: '烟台市', code: '3706' },
    { name: '潍坊市', code: '3707' }, { name: '济宁市', code: '3708' }, { name: '泰安市', code: '3709' },
    { name: '威海市', code: '3710' }, { name: '日照市', code: '3711' }, { name: '临沂市', code: '3713' },
    { name: '德州市', code: '3714' }, { name: '聊城市', code: '3715' }, { name: '滨州市', code: '3716' },
    { name: '菏泽市', code: '3717' }
  ],
  '41': [
    { name: '郑州市', code: '4101' }, { name: '开封市', code: '4102' }, { name: '洛阳市', code: '4103' },
    { name: '平顶山市', code: '4104' }, { name: '安阳市', code: '4105' }, { name: '鹤壁市', code: '4106' },
    { name: '新乡市', code: '4107' }, { name: '焦作市', code: '4108' }, { name: '濮阳市', code: '4109' },
    { name: '许昌市', code: '4110' }, { name: '漯河市', code: '4111' }, { name: '三门峡市', code: '4112' },
    { name: '南阳市', code: '4113' }, { name: '商丘市', code: '4114' }, { name: '信阳市', code: '4115' },
    { name: '周口市', code: '4116' }, { name: '驻马店市', code: '4117' }
  ],
  '42': [
    { name: '武汉市', code: '4201' }, { name: '黄石市', code: '4202' }, { name: '十堰市', code: '4203' },
    { name: '宜昌市', code: '4205' }, { name: '襄阳市', code: '4206' }, { name: '鄂州市', code: '4207' },
    { name: '荆门市', code: '4208' }, { name: '孝感市', code: '4209' }, { name: '荆州市', code: '4210' },
    { name: '黄冈市', code: '4211' }, { name: '咸宁市', code: '4212' }, { name: '随州市', code: '4213' }
  ],
  '43': [
    { name: '长沙市', code: '4301' }, { name: '株洲市', code: '4302' }, { name: '湘潭市', code: '4303' },
    { name: '衡阳市', code: '4304' }, { name: '邵阳市', code: '4305' }, { name: '岳阳市', code: '4306' },
    { name: '常德市', code: '4307' }, { name: '张家界市', code: '4308' }, { name: '益阳市', code: '4309' },
    { name: '郴州市', code: '4310' }, { name: '永州市', code: '4311' }, { name: '怀化市', code: '4312' },
    { name: '娄底市', code: '4313' }
  ],
  '44': [
    { name: '广州市', code: '4401' }, { name: '韶关市', code: '4402' }, { name: '深圳市', code: '4403' },
    { name: '珠海市', code: '4404' }, { name: '汕头市', code: '4405' }, { name: '佛山市', code: '4406' },
    { name: '江门市', code: '4407' }, { name: '湛江市', code: '4408' }, { name: '茂名市', code: '4409' },
    { name: '肇庆市', code: '4412' }, { name: '惠州市', code: '4413' }, { name: '梅州市', code: '4414' },
    { name: '汕尾市', code: '4415' }, { name: '河源市', code: '4416' }, { name: '阳江市', code: '4417' },
    { name: '清远市', code: '4418' }, { name: '东莞市', code: '4419' }, { name: '中山市', code: '4420' },
    { name: '潮州市', code: '4451' }, { name: '揭阳市', code: '4452' }, { name: '云浮市', code: '4453' }
  ],
  '45': [{ name: '南宁市', code: '4501' }, { name: '柳州市', code: '4502' }],
  '46': [{ name: '海口市', code: '4601' }, { name: '三亚市', code: '4602' }],
  '50': [{ name: '重庆市', code: '5001' }],
  '51': [{ name: '成都市', code: '5101' }, { name: '绵阳市', code: '5107' }],
  '52': [{ name: '贵阳市', code: '5201' }],
  '53': [{ name: '昆明市', code: '5301' }],
  '61': [{ name: '西安市', code: '6101' }, { name: '宝鸡市', code: '6103' }],
  '62': [{ name: '兰州市', code: '6201' }],
  '63': [{ name: '西宁市', code: '6301' }],
  '64': [{ name: '银川市', code: '6401' }],
  '65': [{ name: '乌鲁木齐市', code: '6501' }]
}

// 区/县：按市 code 前4位分组
const DISTRICTS_BY_CITY = {
  '1101': [
    { name: '东城区', code: '110101' }, { name: '西城区', code: '110102' }, { name: '朝阳区', code: '110105' },
    { name: '丰台区', code: '110106' }, { name: '石景山区', code: '110107' }, { name: '海淀区', code: '110108' },
    { name: '门头沟区', code: '110109' }, { name: '房山区', code: '110111' }, { name: '通州区', code: '110112' },
    { name: '顺义区', code: '110113' }, { name: '昌平区', code: '110114' }, { name: '大兴区', code: '110115' },
    { name: '怀柔区', code: '110116' }, { name: '平谷区', code: '110117' }, { name: '密云区', code: '110118' },
    { name: '延庆区', code: '110119' }
  ],
  '1201': [
    { name: '和平区', code: '120101' }, { name: '河东区', code: '120102' }, { name: '河西区', code: '120103' },
    { name: '南开区', code: '120104' }, { name: '河北区', code: '120105' }, { name: '红桥区', code: '120106' },
    { name: '东丽区', code: '120110' }, { name: '西青区', code: '120111' }, { name: '津南区', code: '120112' },
    { name: '北辰区', code: '120113' }, { name: '武清区', code: '120114' }, { name: '宝坻区', code: '120115' },
    { name: '滨海新区', code: '120116' }, { name: '宁河区', code: '120117' }, { name: '静海区', code: '120118' },
    { name: '蓟州区', code: '120119' }
  ],
  '1401': [
    { name: '小店区', code: '140105' }, { name: '迎泽区', code: '140106' }, { name: '杏花岭区', code: '140107' },
    { name: '尖草坪区', code: '140108' }, { name: '万柏林区', code: '140109' }, { name: '晋源区', code: '140110' },
    { name: '清徐县', code: '140121' }, { name: '阳曲县', code: '140122' }, { name: '娄烦县', code: '140123' },
    { name: '古交市', code: '140181' }
  ],
  '1402': [
    { name: '平城区', code: '140211' }, { name: '云岗区', code: '140212' }, { name: '新荣区', code: '140213' },
    { name: '云州区', code: '140214' }, { name: '阳高县', code: '140221' }, { name: '天镇县', code: '140222' }
  ],
  '1403': [
    { name: '城区', code: '140302' }, { name: '矿区', code: '140303' }, { name: '郊区', code: '140311' },
    { name: '平定县', code: '140321' }, { name: '盂县', code: '140322' }
  ],
  '1404': [
    { name: '潞州区', code: '140403' }, { name: '上党区', code: '140404' }, { name: '屯留区', code: '140405' },
    { name: '潞城区', code: '140406' }, { name: '襄垣县', code: '140423' }
  ],
  '1405': [
    { name: '城区', code: '140402' }, { name: '泽州县', code: '140525' }, { name: '高平市', code: '140581' }
  ],
  '1406': [
    { name: '朔城区', code: '140602' }, { name: '平鲁区', code: '140603' }, { name: '怀仁市', code: '140681' }
  ],
  '1407': [
    { name: '榆次区', code: '140702' }, { name: '太谷区', code: '140703' }, { name: '介休市', code: '140781' },
    { name: '平遥县', code: '140728' }, { name: '灵石县', code: '140729' }
  ],
  '1408': [
    { name: '盐湖区', code: '140802' }, { name: '河津市', code: '140882' }, { name: '永济市', code: '140881' },
    { name: '芮城县', code: '140830' }
  ],
  '1409': [
    { name: '忻府区', code: '140902' }, { name: '原平市', code: '140981' }, { name: '代县', code: '140923' }
  ],
  '1410': [
    { name: '尧都区', code: '141002' }, { name: '侯马市', code: '141081' }, { name: '霍州市', code: '141082' },
    { name: '洪洞县', code: '141024' }
  ],
  '1411': [
    { name: '离石区', code: '141102' }, { name: '孝义市', code: '141181' }, { name: '汾阳市', code: '141182' },
    { name: '柳林县', code: '141125' }
  ],
  '3101': [
    { name: '黄浦区', code: '310101' }, { name: '徐汇区', code: '310104' }, { name: '长宁区', code: '310105' },
    { name: '静安区', code: '310106' }, { name: '普陀区', code: '310107' }, { name: '虹口区', code: '310109' },
    { name: '杨浦区', code: '310110' }, { name: '闵行区', code: '310112' }, { name: '宝山区', code: '310113' },
    { name: '嘉定区', code: '310114' }, { name: '浦东新区', code: '310115' }, { name: '金山区', code: '310116' },
    { name: '松江区', code: '310117' }, { name: '青浦区', code: '310118' }, { name: '奉贤区', code: '310120' },
    { name: '崇明区', code: '310151' }
  ],
  '3201': [
    { name: '玄武区', code: '320102' }, { name: '秦淮区', code: '320104' }, { name: '建邺区', code: '320105' },
    { name: '鼓楼区', code: '320106' }, { name: '浦口区', code: '320111' }, { name: '栖霞区', code: '320113' },
    { name: '雨花台区', code: '320114' }, { name: '江宁区', code: '320115' }, { name: '六合区', code: '320116' },
    { name: '溧水区', code: '320117' }, { name: '高淳区', code: '320118' }
  ],
  '3301': [
    { name: '上城区', code: '330102' }, { name: '拱墅区', code: '330105' }, { name: '西湖区', code: '330106' },
    { name: '滨江区', code: '330108' }, { name: '萧山区', code: '330109' }, { name: '余杭区', code: '330110' },
    { name: '富阳区', code: '330111' }, { name: '临安区', code: '330112' }, { name: '临平区', code: '330113' },
    { name: '钱塘区', code: '330114' }, { name: '桐庐县', code: '330122' }, { name: '淳安县', code: '330127' },
    { name: '建德市', code: '330182' }
  ],
  '4401': [
    { name: '荔湾区', code: '440103' }, { name: '越秀区', code: '440104' }, { name: '海珠区', code: '440105' },
    { name: '天河区', code: '440106' }, { name: '白云区', code: '440111' }, { name: '黄埔区', code: '440112' },
    { name: '番禺区', code: '440113' }, { name: '花都区', code: '440114' }, { name: '南沙区', code: '440115' },
    { name: '从化区', code: '440117' }, { name: '增城区', code: '440118' }
  ],
  '4403': [
    { name: '罗湖区', code: '440303' }, { name: '福田区', code: '440304' }, { name: '南山区', code: '440305' },
    { name: '宝安区', code: '440306' }, { name: '龙岗区', code: '440307' }, { name: '盐田区', code: '440308' },
    { name: '龙华区', code: '440309' }, { name: '坪山区', code: '440310' }, { name: '光明区', code: '440311' }
  ],
  '5101': [
    { name: '锦江区', code: '510104' }, { name: '青羊区', code: '510105' }, { name: '金牛区', code: '510106' },
    { name: '武侯区', code: '510107' }, { name: '成华区', code: '510108' }, { name: '龙泉驿区', code: '510112' },
    { name: '都江堰市', code: '510181' }, { name: '彭州市', code: '510182' }, { name: '邛崃市', code: '510183' },
    { name: '崇州市', code: '510184' }, { name: '简阳市', code: '510185' }
  ]
}


// 未单独列出的省/市：补全省码对应的市、市码对应的区
function ensureCities(provCode) {
  if (CITIES_BY_PROV[provCode]) return CITIES_BY_PROV[provCode]
  return [{ name: '请选择市', code: provCode + '01' }]
}

function ensureDistricts(cityCode) {
  if (DISTRICTS_BY_CITY[cityCode]) return DISTRICTS_BY_CITY[cityCode]
  // 无明细区县时用 6 位：市 code 补 01 作为占位
  const six = (cityCode + '01').slice(0, 6)
  return [{ name: '请选择区/县', code: six }]
}

export function getProvinces() {
  return PROVINCES
}

export function getCities(provinceCode) {
  return ensureCities(String(provinceCode).slice(0, 2))
}

export function getDistricts(cityCode) {
  return ensureDistricts(String(cityCode).slice(0, 4))
}

export function getRegionLabel(provCode, cityCode, districtCode) {
  const p = PROVINCES.find(x => x.code === String(provCode).slice(0, 2))
  const cities = getCities(provCode)
  const c = cities.find(x => x.code === String(cityCode).slice(0, 4))
  const districts = getDistricts(cityCode)
  const d = districts.find(x => x.code === String(districtCode).slice(0, 6))
  const parts = [p?.name, c?.name, d?.name].filter(Boolean)
  return parts.join(' ') || ''
}

