<template>
  <view class="wxsub-container">
    <view v-if="step===1">
      <form class="form">
        <input class="input" v-model="bank.account_name" :placeholder="modifyMode ? '新开户人姓名' : '开户人姓名'" />
        <view class="picker-wrap">
          <picker mode="selector" :range="bankList" range-key="name" @change="onBankChange">
            <view class="input picker-input">{{ bank.account_bank || '请选择开户银行' }}</view>
          </picker>
        </view>
        <input class="input" v-model="bank.account_number" :placeholder="modifyMode ? '新银行卡号' : '银行卡号'" />
        <view class="picker-wrap">
          <picker mode="selector" :range="regionProvinces" range-key="name" @change="onProvinceChange">
            <view class="input picker-input">{{ regionLabels.province || '请选择省/直辖市' }}</view>
          </picker>
        </view>
        <view class="picker-wrap">
          <picker mode="selector" :range="regionCities" range-key="name" @change="onCityChange">
            <view class="input picker-input">{{ regionLabels.city || '请选择市' }}</view>
          </picker>
        </view>
        <view class="picker-wrap">
          <picker mode="selector" :range="regionDistricts" range-key="name" @change="onDistrictChange">
            <view class="input picker-input">{{ regionLabels.district || '请选择区/县' }}</view>
          </picker>
        </view>
        <input class="input" v-model="bank.bank_name" placeholder="开户支行全称（选完银行与地区后可从列表选择）" />
        <input class="input" v-model="bank.bank_branch_id" placeholder="联行号（选支行后自动带出，可选填）" />
        <input class="input" v-model="bank.sms_mobile" type="number" maxlength="11" placeholder="接收验证码手机号（必填）" />
        <view class="sms-row">
          <input class="input sms-input" v-model="bank.sms_code" placeholder="短信验证码" />
          <view
            class="btn-sms"
            :class="{ disabled: smsSending || smsCountdown > 0 }"
            @tap="onSendSmsTap"
          >
            <text class="btn-sms-text">{{ smsSending ? (smsCountdown > 0 ? smsCountdown + 's' : '发送中...') : '获取验证码' }}</text>
          </view>
        </view>
        <button class="btn" @tap="bindCard" :disabled="submitting">{{ modifyMode ? '申请改绑' : '绑定银行卡' }}</button>
        <button v-if="modifyMode" class="btn btn-outline" @tap="modifyMode=false;step=2">取消</button>
      </form>
    </view>

    <view v-else class="bound-view">
      <text class="bound-title">已绑定银行卡</text>
      <view class="bound-card">
        <text class="label">银行卡：</text>
        <text class="card">{{ boundBankName ? (boundBankName + ' （**** **** **** ' + (boundTail || '****') + '）') : ('**** **** **** ' + (boundTail || '****')) }}</text>
      </view>
      <view style="margin-top:12px;display:flex;gap:8px">
        <button class="btn" @tap="startModify">修改</button>
        <button class="btn danger" @tap="confirmUnbind">解绑</button>
      </view>
    </view>

    <!-- 遮罩层：用于确认解绑与支付密码输入，避免遮挡表单输入 -->
    <view v-if="confirmUnbindModal || showPasswordPanel" class="modal-overlay">
      <view class="modal-backdrop" @tap="onBackdropTap"></view>

      <!-- 确认解绑模态（居中） -->
      <view v-if="confirmUnbindModal" class="confirm-modal">
        <text class="confirm-title">确定要解绑该银行卡吗？</text>
          <view style="display:flex;gap:8px;margin-top:12px">
          <button class="btn danger" @tap="doUnbindConfirmed">确认解绑</button>
          <button class="btn" @tap="onConfirmCancel">取消</button>
        </view>
      </view>

      <!-- 支付密码面板（固定底部，PIN 风格输入） -->
      <view v-if="showPasswordPanel" class="password-panel-bottom">
        <text v-if="!hasPayPassword">设置支付密码（6位数字）</text>
        <text v-else>请输入支付密码</text>

        <!-- PIN 显示区：6 个独立输入框，便于小程序聚焦输入 -->
              <view class="pin-container">
                <input v-for="(d, idx) in 6" :key="idx" :id="'pin-'+idx" class="pin-input" type="tel" inputmode="numeric" maxlength="1"
                  :value="passwordDigits[idx]"
                  @input="e => onDigitInput(idx, e, false)"
                  @keydown="e => onDigitKeydown(idx, e, false)"
                  @focus="() => onDigitFocus(idx, false)"
                  :ref="el => pinRefs[idx] = el"
                  :aria-label="'支付密码第' + (idx+1) + '位'"
                  :tabindex="0"
                  :focus="focusFlags[idx]"
                />
              </view>

        <!-- 如果是设置新密码，显示确认 PIN（6 个独立输入） -->
        <view v-if="!hasPayPassword" style="margin-top:10px">
          <text>确认支付密码</text>
          <view class="pin-container">
            <input v-for="(d, idx) in 6" :key="'c'+idx" :id="'pinc-'+idx" class="pin-input" type="tel" inputmode="numeric" maxlength="1"
              :value="passwordConfirmDigits[idx]"
              @input="e => onDigitInput(idx, e, true)"
              @keydown="e => onDigitKeydown(idx, e, true)"
              @focus="() => onDigitFocus(idx, true)"
              :ref="el => pinConfirmRefs[idx] = el"
              :aria-label="'确认支付密码第' + (idx+1) + '位'"
              :tabindex="0"
              :focus="focusConfirmFlags[idx]"
            />
          </view>
        </view>

        <view style="display:flex;gap:8px;margin-top:12px">
          <button class="btn" @tap="submitPasswordAction">确定</button>
          <button class="btn" @tap="cancelPassword">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick, watch, computed } from 'vue'
import { verifyPayPassword } from '@/api/withdraw.js'
import { bindBankCard, sendBankCardSms, getBankCardStatus, getMyBankCards, applyModifyBankCard } from '@/api/bankcard.js'
import { BANK_LIST, getProvinces, getCities, getDistricts } from '@/utils/bank-region-data.js'

const emit = defineEmits(['refreshed'])

// 开户银行选择（展示用 name，提交用 name）
const bankList = ref(BANK_LIST.map(name => ({ name })))
const regionProvinces = ref(getProvinces())
const regionCities = ref([])
const regionDistricts = ref([])
const selectedProvince = ref(null)
const selectedCity = ref(null)
const selectedDistrict = ref(null)
const regionLabels = ref({ province: '', city: '', district: '' })

const regionCitiesComputed = computed(() => {
  if (!selectedProvince.value) return []
  return getCities(selectedProvince.value.code)
})
const regionDistrictsComputed = computed(() => {
  if (!selectedCity.value) return []
  return getDistricts(selectedCity.value.code)
})

watch(regionCitiesComputed, (list) => {
  regionCities.value = list || []
  if (list.length && selectedCity.value && !list.find(c => c.code === selectedCity.value?.code)) {
    selectedCity.value = null
    selectedDistrict.value = null
    bank.bank_address_code = ''
    regionLabels.value = { ...regionLabels.value, city: '', district: '' }
  }
}, { immediate: true })
watch(regionDistrictsComputed, (list) => {
  regionDistricts.value = list || []
  if (list.length && selectedDistrict.value && !list.find(d => d.code === selectedDistrict.value?.code)) {
    selectedDistrict.value = null
    bank.bank_address_code = ''
    regionLabels.value = { ...regionLabels.value, district: '' }
  }
}, { immediate: true })

function onBankChange(e) {
  const i = e.detail?.value ?? e.target?.value
  if (i != null && bankList.value[i]) {
    bank.account_bank = bankList.value[i].name
  }
}
function onProvinceChange(e) {
  const i = e.detail?.value ?? e.target?.value
  const list = getProvinces()
  if (i != null && list[i]) {
    selectedProvince.value = list[i]
    regionLabels.value = { ...regionLabels.value, province: list[i].name }
    selectedCity.value = null
    selectedDistrict.value = null
    regionLabels.value = { ...regionLabels.value, city: '', district: '' }
    bank.bank_address_code = ''
  }
}
function onCityChange(e) {
  const i = e.detail?.value ?? e.target?.value
  const list = getCities(selectedProvince.value?.code)
  if (i != null && list[i]) {
    selectedCity.value = list[i]
    regionLabels.value = { ...regionLabels.value, city: list[i].name }
    selectedDistrict.value = null
    regionLabels.value = { ...regionLabels.value, district: '' }
    bank.bank_address_code = ''
  }
}
function onDistrictChange(e) {
  const i = e.detail?.value ?? e.target?.value
  const list = getDistricts(selectedCity.value?.code)
  if (i != null && list[i]) {
    selectedDistrict.value = list[i]
    regionLabels.value = { ...regionLabels.value, district: list[i].name }
    bank.bank_address_code = list[i].code
  }
}

// 多输入框 PIN 管理
const passwordDigits = ref(Array.from({length:6}).map(()=>''))
const passwordConfirmDigits = ref(Array.from({length:6}).map(()=>''))
const pinRefs = []
const pinConfirmRefs = []

const focusFlags = ref(Array.from({length:6}).map(()=>false))
const focusConfirmFlags = ref(Array.from({length:6}).map(()=>false))

function onDigitInput(idx, e, isConfirm){
  // Only handle non-empty digit input here. Deletion is handled in keydown handler to avoid double-delete.
  const val = (e && e.detail && (typeof e.detail.value !== 'undefined')) ? String(e.detail.value) : (e && e.target && (typeof e.target.value !== 'undefined') ? String(e.target.value) : '')
  const digit = (val || '').replace(/\D/g,'').slice(-1)
  if(!digit){
    // Deletion path: handle backspace behavior in input event (mini-programs may not fire keydown)
    const arrDel = isConfirm ? passwordConfirmDigits.value : passwordDigits.value
    // If current has value, clear it and do not change focus here.
    if(arrDel[idx]){
      arrDel[idx] = ''
      console.log('[WxSubMerchant] onDigitInput delete clear current (no focus change)', { idx, digits: JSON.stringify(passwordDigits.value) })
      // debug: dump event and refs state
      try{ console.log('[WxSubMerchant] delete event raw', { detail: e && e.detail, target: e && e.target }) }catch(err){ console.log('[WxSubMerchant] delete event read failed', err) }
      try{ console.log('[WxSubMerchant] pinRefs status', pinRefs.map((r,i)=>({i,exists:!!r,hasFocus:!!(r&&r.focus)}))); console.log('[WxSubMerchant] pinConfirmRefs status', pinConfirmRefs.map((r,i)=>({i,exists:!!r,hasFocus:!!(r&&r.focus)}))) }catch(err){ console.log('[WxSubMerchant] pinRefs read failed', err) }
      return
    }
    // Current empty -> immediately move to previous
    if(idx > 0){
      const prev = idx - 1
      const arrPrev = isConfirm ? passwordConfirmDigits.value : passwordDigits.value
      arrPrev[prev] = ''
      console.log('[WxSubMerchant] onDigitInput moving focus to prev', { from: idx, to: prev, digits: JSON.stringify(passwordDigits.value), confirmDigits: JSON.stringify(passwordConfirmDigits.value) })
      // set focus flag to previous then attempt delayed direct focus
      if(isConfirm){
        console.log('[WxSubMerchant] onDigitInput flags before', JSON.stringify(focusConfirmFlags.value))
        focusConfirmFlags.value[idx] = false; focusConfirmFlags.value[prev] = true
        console.log('[WxSubMerchant] onDigitInput flags after', JSON.stringify(focusConfirmFlags.value))
      } else {
        console.log('[WxSubMerchant] onDigitInput flags before', JSON.stringify(focusFlags.value))
        focusFlags.value[idx] = false; focusFlags.value[prev] = true
        console.log('[WxSubMerchant] onDigitInput flags after', JSON.stringify(focusFlags.value))
      }
      nextTick(()=>{
        setTimeout(()=>{
          try{
            const refEl = isConfirm ? pinConfirmRefs[prev] : pinRefs[prev]
                console.log('[WxSubMerchant] onDigitInput attempting direct focus prev', prev, { refExists: !!refEl, hasFocusMethod: !!(refEl && refEl.focus) })
            if(refEl && refEl.focus) refEl.focus()
                console.log('[WxSubMerchant] onDigitInput after direct focus attempt', prev)
          }catch(err){ console.warn('[WxSubMerchant] onDigitInput direct focus failed', err) }
        }, 60)
      })
    }
    return
  }
  console.log('[WxSubMerchant] onDigitInput start', { idx, digit, isConfirm, focusFlags: JSON.stringify(focusFlags.value), focusConfirmFlags: JSON.stringify(focusConfirmFlags.value), nextRefExists: !!(isConfirm ? pinConfirmRefs[idx+1] : pinRefs[idx+1]) })
  const arr = isConfirm ? passwordConfirmDigits.value : passwordDigits.value
  arr[idx] = digit
  // set focus flags to trigger mini-program focus behavior
  if(idx < 5){
    if(isConfirm){
      focusConfirmFlags.value[idx] = false
      nextTick(()=>{
        setTimeout(()=>{ focusConfirmFlags.value[idx+1] = true; console.log('[WxSubMerchant] set focusConfirmFlags', idx+1, JSON.stringify(focusConfirmFlags.value)) }, 50)
      })
    } else {
      focusFlags.value[idx] = false
      nextTick(()=>{
        setTimeout(()=>{ focusFlags.value[idx+1] = true; console.log('[WxSubMerchant] set focusFlags', idx+1, JSON.stringify(focusFlags.value)) }, 50)
      })
    }
  } else {
    if(isConfirm){ focusConfirmFlags.value[idx] = false }
    else { focusFlags.value[idx] = false }
  }
  console.log('[WxSubMerchant] onDigitInput end', { idx, digit, isConfirm, focusFlags: JSON.stringify(focusFlags.value), focusConfirmFlags: JSON.stringify(focusConfirmFlags.value) })
}

function onDigitFocus(idx, isConfirm){
  // 选中当前为空位
  // noop for now
}



function onDigitKeydown(idx, e, isConfirm){
  // noop in mini-program: handle deletion/navigation in onDigitInput
  return
}

function collectPin(isConfirm){
  const arr = isConfirm ? passwordConfirmDigits.value : passwordDigits.value
  return arr.join('')
}

const bank = reactive({
  account_name: '',
  account_bank: '',
  account_number: '',
  bank_name: '',
  bank_address_code: '',
  bank_branch_id: '',
  sms_mobile: '',
  sms_code: ''
})
const smsSending = ref(false)
const smsCountdown = ref(0)
let smsTimer = null

// UI state
const step = ref(1) // 1: bind form, 2: bound view
const boundBank = ref(null)
const boundTail = ref('')
const boundBankName = ref('')
const modifyMode = ref(false)
const confirmUnbindModal = ref(false)
const submitting = ref(false)

// 支付密码管理（解绑时使用）
const payPassword = ref(uni.getStorageSync('pay_password') || null)
const hasPayPassword = ref(!!payPassword.value)
const showPasswordPanel = ref(false)
let pendingAction = '' // 'prepare_modify' | 'prepare_unbind'

async function loadBankStatus() {
  try {
    const statusRes = await getBankCardStatus().catch(() => null)
    const myRes = await getMyBankCards().catch(() => null)
    const cards = myRes?.data ?? myRes?.list ?? (Array.isArray(myRes) ? myRes : [])
    const first = Array.isArray(cards) && cards.length > 0 ? cards[0] : null
    const isBound = statusRes?.data?.bound ?? statusRes?.bound ?? !!first
    if (isBound && first) {
      boundBank.value = first
      boundTail.value = String(first.account_number || first.number || '').slice(-4)
      boundBankName.value = first.bank_name || first.account_bank || first.name || ''
      step.value = 2
    } else {
      const local = uni.getStorageSync('merchant_bound_bank')
      if (local) {
        boundBank.value = local
        boundTail.value = String(local.number || local.account_number || '').slice(-4)
        boundBankName.value = local.name || local.account_bank || ''
        step.value = 2
      }
    }
  } catch (e) {
    const local = uni.getStorageSync('merchant_bound_bank')
    if (local) {
      boundBank.value = local
      boundTail.value = String(local.number || '').slice(-4)
      boundBankName.value = local.name || ''
      step.value = 2
    }
  }
}

onMounted(() => loadBankStatus())

// watch panel visibility AFTER showPasswordPanel is declared
watch(showPasswordPanel, (val) => {
  if(val){
    // reset flags and focus first main input
    nextTick(()=>{
      focusFlags.value = Array.from({length:6}).map(()=>false)
      focusConfirmFlags.value = Array.from({length:6}).map(()=>false)
      // ensure focus toggles to reliably trigger in mini-program
      focusFlags.value[0] = false
      nextTick(()=>{
        setTimeout(()=>{ focusFlags.value[0] = true }, 50)
      })
    })
  } else {
    // clear focus flags when panel closes
    focusFlags.value = Array.from({length:6}).map(()=>false)
    focusConfirmFlags.value = Array.from({length:6}).map(()=>false)
  }
})

// When focus flags change, actually focus the input elements
watch(focusFlags, (flags)=>{
  // rely on template `:focus` binding for mini-program focus behavior
  nextTick(()=>{
    try{ console.log('[WxSubMerchant] focusFlags changed', JSON.stringify(flags)) }catch(e){}
  })
}, { deep: true })

watch(focusConfirmFlags, (flags)=>{
  // rely on template `:focus` binding for mini-program focus behavior
  nextTick(()=>{
    try{ console.log('[WxSubMerchant] focusConfirmFlags changed', JSON.stringify(flags)) }catch(e){}
  })
}, { deep: true })

function validateBank(num) {
  return num && String(num).replace(/\s+/g, '').length >= 12
}

function onSendSmsTap() {
  if (smsSending.value || smsCountdown.value > 0) return
  sendSmsCode()
}

async function sendSmsCode() {
  const num = (bank.account_number || '').replace(/\s+/g, '')
  if (!validateBank(num)) { uni.showToast({ title: '请先输入正确的银行卡号', icon: 'none' }); return }
  const mobile = String(bank.sms_mobile || '').replace(/\s+/g, '')
  if (!mobile || mobile.length !== 11) { uni.showToast({ title: '请填写11位接收验证码手机号', icon: 'none' }); return }
  smsSending.value = true
  smsCountdown.value = 0
  try {
    await sendBankCardSms(num, mobile)
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0 && smsTimer) { clearInterval(smsTimer); smsTimer = null }
    }, 1000)
  } catch (e) {
    uni.showToast({ title: e?.message || '发送失败', icon: 'none' })
  } finally {
    smsSending.value = false
  }
}

function maskNumber(num){
  const s = String(num||'')
  return s.length>4 ? ('**** **** **** ' + s.slice(-4)) : s
}

async function bindCard() {
  const num = (bank.account_number || '').replace(/\s+/g, '')
  if (!validateBank(num)) { uni.showToast({ title: '请输入正确的银行卡号', icon: 'none' }); return }
  if (!bank.sms_code || bank.sms_code.length < 4) { uni.showToast({ title: '请输入短信验证码', icon: 'none' }); return }
  if (!bank.sms_mobile || String(bank.sms_mobile).replace(/\s+/g, '').length !== 11) { uni.showToast({ title: '请填写接收验证码手机号', icon: 'none' }); return }
  if (!bank.account_name || !bank.account_bank) { uni.showToast({ title: '请填写开户人姓名和开户银行', icon: 'none' }); return }

  submitting.value = true
  try {
    if (modifyMode.value) {
      const payload = {
        new_account_bank: bank.account_bank,
        new_account_name: bank.account_name,
        new_account_number: num,
        new_bank_name: bank.bank_name || bank.account_bank,
        bank_address_code: bank.bank_address_code || '110105',
        bank_branch_id: bank.bank_branch_id || '',
        sms_mobile: String(bank.sms_mobile || '').replace(/\s+/g, ''),
        sms_code: bank.sms_code
      }
      await applyModifyBankCard(payload)
      uni.showToast({ title: '改绑申请已提交', icon: 'success' })
      modifyMode.value = false
    } else {
      const payload = {
        account_bank: bank.account_bank,
        account_name: bank.account_name,
        account_number: num,
        bank_name: bank.bank_name || bank.account_bank,
        bank_address_code: bank.bank_address_code || '110105',
        bank_branch_id: bank.bank_branch_id || '',
        sms_mobile: String(bank.sms_mobile || '').replace(/\s+/g, ''),
        sms_code: bank.sms_code
      }
      await bindBankCard(payload)
      uni.showToast({ title: '绑定成功', icon: 'success' })
    }
    emit('refreshed')
    await loadBankStatus()
    bank.sms_code = ''
  } catch (e) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function startModify() {
  modifyMode.value = true
  step.value = 1
  bank.account_name = ''
  bank.account_bank = ''
  bank.account_number = ''
  bank.bank_name = ''
  bank.bank_address_code = ''
  bank.bank_branch_id = ''
  bank.sms_mobile = ''
  bank.sms_code = ''
  selectedProvince.value = null
  selectedCity.value = null
  selectedDistrict.value = null
  regionLabels.value = { province: '', city: '', district: '' }
  regionCities.value = []
  regionDistricts.value = []
}

function confirmUnbind(){
  // first verify password, then show confirm modal
  pendingAction = 'prepare_unbind'
  showPasswordPanel.value = true
}

function cancelPassword(){
  showPasswordPanel.value = false
  // 清空每位输入
  passwordDigits.value = Array.from({length:6}).map(()=>'')
  passwordConfirmDigits.value = Array.from({length:6}).map(()=>'')
  pendingAction = ''
}

function onBackdropTap(){
  // hide any modal and clear password panel
  confirmUnbindModal.value = false
  cancelPassword()
}

function onConfirmCancel(){
  confirmUnbindModal.value = false
}

async function submitPasswordAction(){
  try{
    if(!hasPayPassword.value){
      // set new password flow (使用 PIN)
      const pin = collectPin(false)
      const pinConfirm = collectPin(true)
      if(!pin || pin.length!==6){ uni.showToast({ title: '请输入6位支付密码', icon: 'none' }); return }
      if(pin !== pinConfirm){ uni.showToast({ title: '两次输入密码不一致', icon: 'none' }); return }
      // save (plain for demo)
      uni.setStorageSync('pay_password', pin)
      payPassword.value = pin
      hasPayPassword.value = true
      uni.showToast({ title: '支付密码已设置', icon: 'success' })
      // continue with pending action
    } else {
      const pin = collectPin(false)
      if(!pin){ uni.showToast({ title: '请输入支付密码', icon: 'none' }); return }
      // verify: prefer local stored password, otherwise fallback to api verify
      const uid = (uni.getStorageSync('userInfo') || {}).user_id || 'unknown'
      const local = uni.getStorageSync('pay_password') || null
      let ok = false
      if(local){ ok = pin === local }
      else { ok = await verifyPayPassword(uid, pin) }
      if(!ok){ uni.showToast({ title: '支付密码错误', icon: 'none' }); return }
    }

    // perform pending action
    if(pendingAction === 'prepare_modify'){
      const stored = boundBank.value || uni.getStorageSync('merchant_bound_bank') || {}
      bank.account_name = stored.account_name || stored.name || ''
      bank.account_bank = stored.account_bank || stored.name || ''
      bank.account_number = stored.account_number || stored.number || ''
      bank.bank_name = stored.bank_name || ''
      bank.bank_address_code = stored.bank_address_code || ''
      bank.bank_branch_id = stored.bank_branch_id || ''
      modifyMode.value = true
      step.value = 1
    } else if(pendingAction === 'prepare_unbind'){
      // show confirm modal to finalize unbind
      confirmUnbindModal.value = true
    }

    // reset
    cancelPassword()
  }catch(e){ console.error('密码操作失败', e); uni.showToast({ title: '操作失败', icon: 'none' }) }
}

function doUnbindConfirmed() {
  try {
    uni.removeStorageSync('merchant_bound_bank')
    boundBank.value = null
    boundTail.value = ''
    boundBankName.value = ''
    confirmUnbindModal.value = false
    step.value = 1
    emit('refreshed')
    loadBankStatus()
    uni.$emit && uni.$emit('merchant:bank:removed')
    uni.showToast({ title: '解绑成功', icon: 'success' })
  } catch (e) { console.error(e); uni.showToast({ title: '解绑失败', icon: 'none' }) }
}
</script>

<style lang="scss" scoped>
.wxsub-container {
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  background: transparent;
}
.form {
  width: 100%;
  box-sizing: border-box;
}
.header { font-weight: 600; margin-bottom: 20rpx }
.form .input {
  display: block;
  margin: 0 0 24rpx;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e8e8e8;
  font-size: 28rpx;
  background: #fafafa;
}
.form .input:focus {
  background: #fff;
  border-color: #1890ff;
}
.picker-wrap {
  margin: 0 0 24rpx;
}
.picker-input {
  display: block;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  border: 1rpx solid #e8e8e8;
  font-size: 28rpx;
  background: #fafafa;
  color: #333;
}
.sms-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin: 0 0 24rpx;
}
.sms-input { flex: 1; margin-bottom: 0 !important }
.btn-sms {
  flex-shrink: 0;
  padding: 20rpx 32rpx;
  font-size: 26rpx;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(24, 144, 255, 0.35);
  &.disabled {
    opacity: 0.6;
  }
  .btn-sms-text {
    font-weight: 500;
  }
}
.btn {
  margin-top: 24rpx;
  padding: 24rpx;
  font-size: 30rpx;
  font-weight: 500;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  color: #fff;
  border-radius: 32rpx;
  border: none;
  box-shadow: 0 4rpx 16rpx rgba(24, 144, 255, 0.3);
}
.danger { background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%) }
.bound-view { padding: 24rpx }
.bound-title { font-weight: 700; font-size: 32rpx; margin-bottom: 24rpx }
.bound-card { display: flex; align-items: center; gap: 16rpx }
.modal-overlay { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 9999 }
.modal-backdrop { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,0.45); z-index: 9999 }
.confirm-modal { position: fixed; left: 6%; right: 6%; top: 16%; background: #fff; padding: 32rpx; border-radius: 20rpx; z-index: 10001; border: 1rpx solid #eee; max-height: 68vh; overflow: auto }
.confirm-title { font-weight: 600; margin-bottom: 16rpx }
.password-panel-bottom { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 32rpx; padding-bottom: calc(32rpx + env(safe-area-inset-bottom)); border-top-left-radius: 24rpx; border-top-right-radius: 24rpx; z-index: 10001; border: 1rpx solid #eee; box-shadow: 0 -8rpx 36rpx rgba(0,0,0,0.08) }

.pin-container { display: flex; justify-content: center; gap: 16rpx; margin-top: 20rpx }
.pin-input { width: 88rpx; height: 88rpx; border-radius: 12rpx; border: 1rpx solid #e6e6e6; background: #fff; text-align: center; font-size: 40rpx }
.pin-input:focus { outline: 2rpx solid #1890ff }
.pin-char { font-size: 40rpx; letter-spacing: 12rpx }
.btn-outline { margin-top: 16rpx; background: #fff; color: #1890ff; border: 1rpx solid #1890ff }
</style>
