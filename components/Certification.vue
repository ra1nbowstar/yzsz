<template>
  <view class="cert-container">
    <form v-if="step === 1" class="cert-form">
      <!-- 个人认证 -->
      <view v-if="!isEnterprise" class="form-section personal">
        <view class="form-card">
          <view class="form-item">
            <text class="form-label">姓名</text>
            <input class="form-input" v-model="form.name" placeholder="请输入真实姓名" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">身份证号</text>
            <input class="form-input" v-model="form.id" placeholder="请输入18位身份证号" placeholder-class="placeholder" type="idcard" />
          </view>
          <view class="form-item">
            <text class="form-label">身份证有效期起</text>
            <picker mode="multiSelector" :range="periodBeginRange" :value="periodBeginValue" @change="onPeriodBeginChange">
              <view class="form-input picker-input" :class="{ placeholder: !form.id_card_period_begin }">{{ form.id_card_period_begin || '请选择年月日' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">身份证有效期止</text>
            <picker mode="multiSelector" :range="periodEndRange" :value="periodEndValue" @change="onPeriodEndChange">
              <view class="form-input picker-input" :class="{ placeholder: !form.id_card_period_end }">{{ form.id_card_period_end || '请选择年月日' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">联系手机（超级管理员）</text>
            <input
              class="form-input"
              v-model="form.mobile_phone"
              placeholder="11位手机号"
              placeholder-class="placeholder"
              type="number"
              maxlength="11"
              @input="onMobilePhoneInput"
            />
          </view>
          <view class="form-item">
            <text class="form-label">联系邮箱（超级管理员）</text>
            <input class="form-input" v-model="form.contact_email" placeholder="用于接收开户邮件" placeholder-class="placeholder" type="text" />
          </view>
          <view class="form-item">
            <text class="form-label">商户简称</text>
            <input class="form-input" v-model="form.merchant_shortname" placeholder="1-64字，支付页展示用" placeholder-class="placeholder" />
          </view>
        </view>
        <view class="upload-card id-card-upload">
          <text class="upload-title">身份证照片</text>
          <text class="upload-hint">上传身份证人像面、国徽面各一张，支持预览、删除</text>
          <view class="upload-requirement"><text class="upload-requirement-text">照片需<text class="upload-requirement-red">清晰、完整</text>，且在有效期内</text></view>
          <view class="upload-row id-card-row">
            <view class="upload-col">
              <text class="upload-col-label">人像面</text>
              <view class="upload-list">
                <view v-for="(img, idx) in form.idFrontList" :key="'f' + idx" class="upload-box has-img">
                  <image class="upload-img" :src="img" mode="aspectFit" @tap="previewImage(form.idFrontList, idx)" />
                  <view class="upload-remove" @tap.stop="removeImage(form.idFrontList, idx)">
                    <text class="iconfont icon-shanchu"></text>
                  </view>
                </view>
                <view v-if="!form.idFrontList.length" class="upload-box add" @tap="uploadImg('idFrontList')">
                  <text class="iconfont icon-xiangji upload-icon"></text>
                  <text class="upload-add-text">上传</text>
                </view>
                <view v-else class="upload-box add replace" @tap="uploadImg('idFrontList')">
                  <text class="upload-add-text">替换</text>
                </view>
              </view>
            </view>
            <view class="upload-col">
              <text class="upload-col-label">国徽面</text>
              <view class="upload-list">
                <view v-for="(img, idx) in form.idBackList" :key="'b' + idx" class="upload-box has-img">
                  <image class="upload-img" :src="img" mode="aspectFit" @tap="previewImage(form.idBackList, idx)" />
                  <view class="upload-remove" @tap.stop="removeImage(form.idBackList, idx)">
                    <text class="iconfont icon-shanchu"></text>
                  </view>
                </view>
                <view v-if="!form.idBackList.length" class="upload-box add" @tap="uploadImg('idBackList')">
                  <text class="iconfont icon-xiangji upload-icon"></text>
                  <text class="upload-add-text">上传</text>
                </view>
                <view v-else class="upload-box add replace" @tap="uploadImg('idBackList')">
                  <text class="upload-add-text">替换</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 企业认证 -->
      <view v-else class="form-section enterprise">
        <view class="form-card">
          <view class="section-label">企业信息</view>
          <view class="form-item">
            <text class="form-label">企业名称</text>
            <input class="form-input" v-model="form.company_name" placeholder="请输入企业全称" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">统一社会信用代码</text>
            <input class="form-input" v-model="form.credit_code" placeholder="18位统一社会信用代码" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">注册地址</text>
            <input class="form-input" v-model="form.register_address" placeholder="请输入注册地址" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">经营类目</text>
            <input class="form-input" v-model="form.business_category" placeholder="如：零售、餐饮等" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">商户简称</text>
            <input class="form-input" v-model="form.merchant_shortname" placeholder="1-64字，支付页展示用" placeholder-class="placeholder" />
          </view>
        </view>
        <view class="upload-card">
          <text class="upload-title">证照材料</text>
          <text class="upload-hint">上传营业执照、法人身份证人像面/国徽面各一张（法人身份证必填）</text>
          <view class="upload-requirement"><text class="upload-requirement-text">证照需<text class="upload-requirement-red">清晰、完整</text></text></view>
          <view class="upload-grid">
            <view class="upload-col">
              <text class="upload-col-label">营业执照</text>
              <view class="upload-list">
                <view v-for="(img, idx) in form.licenseList" :key="'l' + idx" class="upload-box has-img">
                  <image class="upload-img" :src="img" mode="aspectFit" @tap="previewImage(form.licenseList, idx)" />
                  <view class="upload-remove" @tap.stop="removeImage(form.licenseList, idx)">
                    <text class="iconfont icon-shanchu"></text>
                  </view>
                </view>
                <view v-if="!form.licenseList.length" class="upload-box add" @tap="uploadImg('licenseList')">
                  <text class="iconfont icon-xiangji upload-icon"></text>
                  <text class="upload-add-text">上传</text>
                </view>
                <view v-else class="upload-box add replace" @tap="uploadImg('licenseList')">
                  <text class="upload-add-text">替换</text>
                </view>
              </view>
            </view>
            <view class="upload-col">
              <text class="upload-col-label">法人人像面</text>
              <view class="upload-list">
                <view v-for="(img, idx) in form.legalFrontList" :key="'lf' + idx" class="upload-box has-img">
                  <image class="upload-img" :src="img" mode="aspectFit" @tap="previewImage(form.legalFrontList, idx)" />
                  <view class="upload-remove" @tap.stop="removeImage(form.legalFrontList, idx)">
                    <text class="iconfont icon-shanchu"></text>
                  </view>
                </view>
                <view v-if="!form.legalFrontList.length" class="upload-box add" @tap="uploadImg('legalFrontList')">
                  <text class="iconfont icon-xiangji upload-icon"></text>
                  <text class="upload-add-text">上传</text>
                </view>
                <view v-else class="upload-box add replace" @tap="uploadImg('legalFrontList')">
                  <text class="upload-add-text">替换</text>
                </view>
              </view>
            </view>
            <view class="upload-col">
              <text class="upload-col-label">法人国徽面</text>
              <view class="upload-list">
                <view v-for="(img, idx) in form.legalBackList" :key="'lb' + idx" class="upload-box has-img">
                  <image class="upload-img" :src="img" mode="aspectFit" @tap="previewImage(form.legalBackList, idx)" />
                  <view class="upload-remove" @tap.stop="removeImage(form.legalBackList, idx)">
                    <text class="iconfont icon-shanchu"></text>
                  </view>
                </view>
                <view v-if="!form.legalBackList.length" class="upload-box add" @tap="uploadImg('legalBackList')">
                  <text class="iconfont icon-xiangji upload-icon"></text>
                  <text class="upload-add-text">上传</text>
                </view>
                <view v-else class="upload-box add replace" @tap="uploadImg('legalBackList')">
                  <text class="upload-add-text">替换</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="form-card">
          <view class="section-label">对公账户</view>
          <view class="form-item">
            <text class="form-label">对公银行名称</text>
            <input class="form-input" v-model="form.bank_name" placeholder="请输入开户银行名称" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">对公账户</text>
            <input class="form-input" v-model="form.bank_account" placeholder="请输入银行账号" placeholder-class="placeholder" type="number" />
          </view>
        </view>
        <view class="form-card agent-card">
          <view class="section-label">法定代表人信息</view>
          <view class="form-item">
            <text class="form-label">法人姓名</text>
            <input class="form-input" v-model="form.legal_name" placeholder="营业执照上的法定代表人姓名" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">法人身份证号</text>
            <input class="form-input" v-model="form.legal_id" placeholder="18位身份证号" placeholder-class="placeholder" type="idcard" />
          </view>
          <view class="form-item">
            <text class="form-label">法人身份证有效期起</text>
            <picker mode="multiSelector" :range="periodBeginRange" :value="periodBeginValue" @change="onPeriodBeginChange">
              <view class="form-input picker-input" :class="{ placeholder: !form.id_card_period_begin }">{{ form.id_card_period_begin || '请选择年月日' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">法人身份证有效期止</text>
            <picker mode="multiSelector" :range="periodEndRange" :value="periodEndValue" @change="onPeriodEndChange">
              <view class="form-input picker-input" :class="{ placeholder: !form.id_card_period_end }">{{ form.id_card_period_end || '请选择年月日' }}</view>
            </picker>
          </view>
          <view class="section-label">经办人 <text class="optional">（可选）</text></view>
          <view class="form-item">
            <text class="form-label">经办人姓名</text>
            <input class="form-input" v-model="form.agent_name" placeholder="请输入经办人姓名" placeholder-class="placeholder" />
          </view>
          <view class="form-item">
            <text class="form-label">经办人证件号</text>
            <input class="form-input" v-model="form.agent_id" placeholder="请输入证件号码" placeholder-class="placeholder" type="idcard" />
          </view>
          <view class="form-item">
            <text class="form-label">联系手机（超级管理员）</text>
            <input
              class="form-input"
              v-model="form.mobile_phone"
              placeholder="11位手机号"
              placeholder-class="placeholder"
              type="number"
              maxlength="11"
              @input="onMobilePhoneInput"
            />
          </view>
          <view class="form-item">
            <text class="form-label">联系邮箱（超级管理员）</text>
            <input class="form-input" v-model="form.contact_email" placeholder="用于接收开户邮件" placeholder-class="placeholder" type="text" />
          </view>
          <view class="upload-single">
            <text class="form-label">授权书</text>
            <view class="upload-box add single" @tap="uploadImg('agentAuth')">
              <image v-if="form.agentAuth" class="upload-img" :src="form.agentAuth" mode="aspectFit" />
              <view v-else class="upload-placeholder">
                <text class="iconfont icon-xiangji upload-icon"></text>
                <text class="upload-add-text">上传授权书</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-btns">
        <view 
          class="btn btn-draft" 
          :class="{ disabled: savingDraft }" 
          @tap="!savingDraft && saveDraft()"
        >
          {{ savingDraft ? '保存中...' : '保存草稿' }}
        </view>
        <view 
          class="btn btn-submit" 
          :class="{ disabled: submitting }" 
          @tap="!submitting && submitCert()"
        >
          {{ submitting ? '审核中...' : '提交审核' }}
        </view>
      </view>
    </form>

    <view v-if="step === 2" class="status-box">
      <text class="status">{{ statusText }}</text>
      <text v-if="statusMeta && statusMeta.updated_at" class="time">提交时间：{{ statusMeta.updated_at }}</text>
      <text v-if="rejectReason" class="reason">驳回原因：{{ rejectReason }}</text>
      <view v-if="statusMeta && statusMeta.suggestions" class="suggest">建议：{{ statusMeta.suggestions }}</view>

      <view class="applyment-detail" v-if="currentApplyment">
        <view class="detail-row"><text class="label">业务编号：</text><text>{{ currentApplyment.business_code ||
          currentApplyment.id }}</text></view>
        <view class="detail-row"><text class="label">进件ID：</text><text>{{ currentApplyment.applyment_id || '-' }}</text>
        </view>
        <view class="detail-row"><text class="label">子商户号：</text><text>{{ currentApplyment.sub_mchid || '-' }}</text>
        </view>
        <view class="detail-row"><text class="label">主体类型：</text><text>{{ currentApplyment.subject_type }}</text></view>
        <view class="detail-row"><text class="label">提交时间：</text><text>{{ currentApplyment.submitted_at ||
          currentApplyment.created_at || '-' }}</text></view>
        <view class="detail-row"><text class="label">最新状态：</text><text>{{ currentApplyment.applyment_state_msg ||
          currentApplyment.applyment_state }}</text></view>
      </view>

      <view class="media-section">
        <text class="media-title">已上传材料</text>
        <view class="media-list">
          <view v-for="m in mediaList" :key="m.id" class="media-item">
            <image class="media-thumb" :src="m.url" mode="aspectFill" @tap="previewMediaItem(m)" />
            <view class="media-info">
              <text class="media-name">{{ m.filename || m.name || m.id }}</text>
              <text class="media-type">{{ m.media_type }}</text>
            </view>
            <button class="btn-small" @tap="previewMediaItem(m)">预览</button>
          </view>
          <text v-if="mediaList.length === 0" class="media-empty">暂无材料</text>
        </view>
        <view class="media-actions">
          <button class="edit" @tap="refreshApplyment">刷新进件状态</button>
        </view>
      </view>

      <view class="status-actions">
        <button v-if="status === 'rejected' || status === 'auto_rejected'" class="edit"
          @tap="editAfterSubmit">修改并重新提交</button>
        <button v-if="status === 'under_review' || status === 'checking'" class="edit" @tap="refreshApplyment">查看进度 /
          刷新</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { faceVerify, verifyPersonal, verifyEnterprise, createWechatApplymentDraft } from '@/api/merchant.js'
import { createDraft, updateDraft, listApplyments, submitApplyment, uploadMedia, listMedia, getApplymentById, getApplymentConfig } from '@/api/wechat_applyment.js'
import config from '@/utils/config.js'

// 表单字段 -> 后端 media_type 映射（后端要求 id_card_front / id_card_back 等）
const isEnterprise = computed(() => type.value === 'enterprise')

// 身份证有效期：多列选择器 [类型, 年, 月, 日]，类型含「长期」，支持完整年月日
const PERIOD_TYPE = ['选择日期', '长期']
const PERIOD_YEARS = Array.from({ length: 51 }, (_, i) => String(1990 + i))
const PERIOD_MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const PERIOD_DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

const periodBeginRange = [PERIOD_TYPE, PERIOD_YEARS, PERIOD_MONTHS, PERIOD_DAYS]
const periodEndRange = [PERIOD_TYPE, PERIOD_YEARS, PERIOD_MONTHS, PERIOD_DAYS]

function _parsePeriodToValue(v) {
  if (!v || v === '长期') return [1, 15, 0, 0]
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return [0, 15, 0, 0]
  const yIdx = PERIOD_YEARS.indexOf(m[1])
  const moIdx = PERIOD_MONTHS.indexOf(m[2])
  const dIdx = Math.min(parseInt(m[3], 10), 31) - 1
  return [0, yIdx >= 0 ? yIdx : 15, moIdx >= 0 ? moIdx : 0, Math.max(0, dIdx)]
}

function _valueToPeriod(val) {
  if (!val || val[0] === 1) return '长期'
  const y = PERIOD_YEARS[val[1]] || '2000'
  const m = PERIOD_MONTHS[val[2]] || '01'
  const d = PERIOD_DAYS[val[3]] || '01'
  const maxDay = new Date(parseInt(y), parseInt(m), 0).getDate()
  const day = Math.min(parseInt(d), maxDay)
  return `${y}-${m}-${String(day).padStart(2, '0')}`
}

function _today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const periodBeginValue = computed(() => _parsePeriodToValue(form.id_card_period_begin))
const periodEndValue = computed(() => _parsePeriodToValue(form.id_card_period_end))

const FIELD_TO_MEDIA_TYPE = {
  idFrontList: 'id_card_front',
  idBackList: 'id_card_back',
  idFront: 'id_card_front',
  idBack: 'id_card_back',
  licenseList: 'business_license',
  license: 'business_license',
  legalFrontList: 'id_card_front',
  legalBackList: 'id_card_back',
  legalFront: 'id_card_front',
  legalBack: 'id_card_back',
  agentAuth: 'authorization_letter'
}

const step = ref(0)
const type = ref('personal')
const status = ref('pending')
const rejectReason = ref('')
const facePassed = ref(false)
const submitting = ref(false)
const savingDraft = ref(false)

const form = reactive({
  // 个人
  name: '',
  id: '',
  id_card_period_begin: '',
  id_card_period_end: '',
  idFront: '',
  idBack: '',
  // 企业
  company_name: '',
  credit_code: '',
  register_address: '',
  business_category: '',
  license: '',
  legalFront: '',
  legalBack: '',
  // lists for multi-image support
  idFrontList: [],
  idBackList: [],
  licenseList: [],
  legalFrontList: [],
  legalBackList: [],
  bank_name: '',
  bank_account: '',
  // 经办人
  agent_name: '',
  agent_id: '',
  legal_name: '',
  legal_id: '',
  agentAuth: '',
  mobile_phone: '',
  contact_email: '',
  merchant_shortname: ''
})

const currentApplyment = ref(null)
const mediaList = ref([])

function _mapDraftToForm(rec) {
  if (!rec) return
  try {
    const s = rec.subject_info || {}
    const b = rec.bank_account_info || {}
    // map common fields if present
    if (s.name) form.name = s.name
    if (s.id_number) form.id = s.id_number
    if (s.company_name) form.company_name = s.company_name
    const idCard = s.identity_info?.id_card_info || s.identity_info || {}
    if (idCard.id_card_name) {
      if (type.value === 'enterprise') form.legal_name = idCard.id_card_name
      else form.name = idCard.id_card_name
    }
    if (idCard.id_card_number) {
      if (type.value === 'enterprise') form.legal_id = idCard.id_card_number
      else form.id = idCard.id_card_number
    }
    if (idCard.card_period_begin) form.id_card_period_begin = (idCard.card_period_begin === '9999-12-31' || idCard.card_period_begin === '长期') ? '长期' : idCard.card_period_begin
    if (idCard.card_period_end) form.id_card_period_end = (idCard.card_period_end === '9999-12-31' || idCard.card_period_end === '长期') ? '长期' : idCard.card_period_end
    if (s.credit_code) form.credit_code = s.credit_code
    if (s.register_address) form.register_address = s.register_address
    if (s.business_category) form.business_category = s.business_category
    if (b.number) form.bank_account = b.number
    if (b.bank_name) form.bank_name = b.bank_name
  } catch (e) { console.warn('map draft failed', e) }
}

function selectType(t) {
  console.log('api代码为调用，选择实名认证类型：', t)
  type.value = t
  step.value = 1
  status.value = 'pending'
  rejectReason.value = ''
}

function onPeriodBeginChange(e) {
  const val = (e.detail?.value || []).map(Number)
  const v = _valueToPeriod(val)
  form.id_card_period_begin = v
  if (v === '长期') form.id_card_period_end = '长期'
}

function onPeriodEndChange(e) {
  const val = (e.detail?.value || []).map(Number)
  const v = _valueToPeriod(val)
  form.id_card_period_end = v
  if (v === '长期') form.id_card_period_begin = '长期'
}

function onMobilePhoneInput(e) {
  const raw = e?.detail?.value ?? ''
  const digits = String(raw).replace(/\D/g, '').slice(0, 11)
  form.mobile_phone = digits
}

// Storage keys per type
const STORAGE_KEYS = {
  personal: 'cert_form_personal',
  enterprise: 'cert_form_enterprise'
}

function loadFormFromStorage(t) {
  try {
    const key = STORAGE_KEYS[t || type.value]
    const raw = uni.getStorageSync(key)
    if (raw && typeof raw === 'object') {
      Object.assign(form, raw)
      // 所有照片仅需一张，多图时只保留第一张
      const listFields = ['idFrontList', 'idBackList', 'licenseList', 'legalFrontList', 'legalBackList']
      listFields.forEach(f => {
        if (Array.isArray(form[f]) && form[f].length > 1) {
          form[f] = [form[f][0]]
        }
      })
      console.log('加载本地保存的实名认证表单:', key)
    }
  } catch (e) {
    console.warn('加载本地表单失败', e)
  }
}

function saveFormToStorage(t) {
  try {
    const key = STORAGE_KEYS[t || type.value]
    // 深拷贝只保存当前类型相关字段
    const payload = {}
    if ((t || type.value) === 'personal') {
      payload.name = form.name
      payload.id = form.id
      payload.idFront = form.idFront
      payload.idBack = form.idBack
      payload.idFrontList = form.idFrontList || []
      payload.idBackList = form.idBackList || []
      payload.id_card_period_begin = form.id_card_period_begin
      payload.id_card_period_end = form.id_card_period_end
      payload.mobile_phone = form.mobile_phone
      payload.contact_email = form.contact_email
      payload.merchant_shortname = form.merchant_shortname
    } else {
      payload.company_name = form.company_name
      payload.credit_code = form.credit_code
      payload.register_address = form.register_address
      payload.business_category = form.business_category
      payload.license = form.license
      payload.legalFront = form.legalFront
      payload.legalBack = form.legalBack
      payload.licenseList = form.licenseList || []
      payload.legalFrontList = form.legalFrontList || []
      payload.legalBackList = form.legalBackList || []
      payload.bank_name = form.bank_name
      payload.bank_account = form.bank_account
      payload.agent_name = form.agent_name
      payload.agent_id = form.agent_id
      payload.legal_name = form.legal_name
      payload.legal_id = form.legal_id
      payload.id_card_period_begin = form.id_card_period_begin
      payload.id_card_period_end = form.id_card_period_end
      payload.agentAuth = form.agentAuth
      payload.mobile_phone = form.mobile_phone
      payload.contact_email = form.contact_email
      payload.merchant_shortname = form.merchant_shortname
    }
    uni.setStorageSync(key, payload)
    console.log('已保存实名认证表单到本地:', key)
  } catch (e) {
    console.warn('保存本地表单失败', e)
  }
}

onMounted(() => {
  // 优先从路由查询参数获取类型，其次使用本地存储的上次选择类型（默认 personal）
  try {
    let chosen = null
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages() || []
      const cur = pages[pages.length - 1] || {}
      // 小程序端 currentPage.options.type 存在于 options
      if (cur && cur.options && cur.options.type) chosen = cur.options.type
      // H5 / 其他平台可能挂载在 $page.options
      if (!chosen && cur && cur.$page && cur.$page.options && cur.$page.options.type) chosen = cur.$page.options.type
    }
    const lastType = uni.getStorageSync('cert_last_type')
    if (!chosen && lastType) chosen = lastType
    if (chosen) {
      type.value = chosen
      // 直接进入表单步骤
      step.value = 1
    }
    // 加载本地表单数据（以确定 type 为准）
    loadFormFromStorage(type.value)
    // 若身份证有效期未填写，默认起止日期为今天，方便用户直接提交
    if (!form.id_card_period_begin) form.id_card_period_begin = _today()
    if (!form.id_card_period_end) form.id_card_period_end = _today()
  } catch (e) {
    console.warn('初始化认证类型失败', e)
    const lastType = uni.getStorageSync('cert_last_type')
    if (lastType) type.value = lastType
    loadFormFromStorage(type.value)
    if (!form.id_card_period_begin) form.id_card_period_begin = _today()
    if (!form.id_card_period_end) form.id_card_period_end = _today()
  }

  // try to load existing draft for current user
  (async () => {
    try {
      const drafts = await listApplyments({ is_draft: 1 })
      if (drafts && drafts.length > 0) {
        currentApplyment.value = drafts[0]
        _mapDraftToForm(currentApplyment.value)
        // set UI to draft editing (只有在未通过上面路由/存储初始化时需要)
        if (!step.value) step.value = 1
      }
    } catch (e) { console.warn('load drafts failed', e) }
  })()

  // subscribe to applyment updates
  if (uni && uni.$on) {
    uni.$on('wechat:applyment:updated', (rec) => {
      try {
        if (!rec) return
        if (currentApplyment.value && String(rec.id) === String(currentApplyment.value.id)) {
          currentApplyment.value = Object.assign({}, currentApplyment.value, rec)
          // reflect status
          if (rec.applyment_state === 'APPLYMENT_STATE_FINISHED') {
            status.value = 'approved'
            submitting.value = false
            saveStatusMeta('approved')
          } else if (rec.applyment_state === 'APPLYMENT_STATE_REJECTED') {
            status.value = 'rejected'
            submitting.value = false
            rejectReason.value = rec.applyment_state_msg || '被驳回'
            saveStatusMeta('rejected', rejectReason.value)
          } else if (rec.applyment_state === 'APPLYMENT_STATE_AUDITING' || rec.applyment_state === 'APPLYMENT_STATE_AUDITING') {
            status.value = 'under_review'
          }
        }
      } catch (e) { console.warn(e) }
    })
  }
})

onBeforeUnmount(() => {
  if (uni && uni.$off) uni.$off('wechat:applyment:updated')
})

async function uploadImg(field) {
  console.log('api代码为调用，打开图片选择：', field)
  try {
    const res = await new Promise((resolve, reject) => {
      uni.chooseImage({ count: 1, success: r => resolve(r), fail: err => reject(err) })
    })
    const tempPath = res.tempFilePaths && res.tempFilePaths[0]
    if (!tempPath) {
      uni.showToast({ title: '未选择图片', icon: 'none' })
      return
    }
    // 文件类型与大小校验
    const ok = await validateImage(tempPath)
    if (!ok.passed) {
      uni.showToast({ title: ok.reason || '图片不满足要求', icon: 'none' })
      return
    }
    // 所有照片仅需一张：列表字段也只保留一张，新上传则替换
    if (field.endsWith('List')) {
      form[field] = [tempPath]
    } else {
      form[field] = tempPath
    }
    // 如果存在草稿或未创建草稿，则上传到 applyment 媒体库（需传本地路径给 uni.uploadFile）
    try {
      if (!currentApplyment.value) {
        currentApplyment.value = await createDraft({ subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL', subject_info: {}, contact_info: {}, bank_account_info: {} })
      }
      const applymentId = currentApplyment.value.applyment_id ?? currentApplyment.value.id
      const mediaType = FIELD_TO_MEDIA_TYPE[field] || field
      await uploadMedia({ file: tempPath, media_type: mediaType, applyment_id: applymentId })
    } catch (e) { console.warn('applyment uploadMedia failed', e) }
    // 保存本地临时数据
    saveFormToStorage()
  } catch (err) {
    console.error('选择或上传图片失败', err)
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
}

// 预览图片数组
function previewImage(list, idx) {
  try {
    const urls = list.slice()
    uni.previewImage({ current: urls[idx], urls })
  } catch (e) {
    console.warn('预览失败', e)
  }
}

function removeImage(list, idx) {
  try {
    list.splice(idx, 1)
    saveFormToStorage()
  } catch (e) {
    console.warn('删除图片失败', e)
  }
}

// 校验图片格式/大小/清晰度(简易检测)
async function validateImage(filePath) {
  // 检查扩展名
  const lower = (filePath || '').toLowerCase()
  if (!/\.(jpg|jpeg|png)$/.test(lower)) return { passed: false, reason: '仅支持 JPG/PNG 格式' }
  // 检查文件大小 <= 10MB
  try {
    if (uni.getFileSystemManager && typeof uni.getFileSystemManager === 'function') {
      const fs = uni.getFileSystemManager()
      const info = await new Promise((resolve, reject) => fs.getFileInfo({ filePath, success: resolve, fail: reject }))
      const sizeMB = (info.size || 0) / 1024 / 1024
      if (sizeMB > 10) return { passed: false, reason: '文件不能超过10MB' }
      if (sizeMB < 0.01) return { passed: false, reason: '图片太小，可能不清晰' }
    }
  } catch (e) {
    console.warn('无法获取文件信息，跳过大小检测', e)
  }
  return { passed: true }
}

async function startFace() {
  console.log('api代码为调用，开始人脸识别，实名组件前端运行正常')
  status.value = 'checking'
  step.value = 2
  try {
    // 对企业与个人均需法人/本人活体
    // 这里使用任意一张已上传的身份证图片作为人脸图占位
    const faceImage = form.idFront || form.legalFront || ''
    if (!faceImage) {
      uni.showToast({ title: '请先上传证件人像照片', icon: 'none' })
      status.value = 'pending'
      step.value = 1
      return
    }
    const res = await faceVerify(faceImage)
    if (res && res.success) {
      uni.showToast({ title: '人脸识别通过', icon: 'success' })
      facePassed.value = true
      // 保存识别状态/表单
      saveFormToStorage()
      // 回退到表单界面并滚动到提交位置，方便用户直接提交审核
      status.value = 'pending'
      step.value = 1
      try {
        // 延迟一点以确保页面渲染完成
        setTimeout(() => {
          if (typeof uni.pageScrollTo === 'function') {
            uni.pageScrollTo({ scrollTop: 99999, duration: 300 })
          }
        }, 80)
      } catch (e) {
        console.warn('滚动到提交位置失败', e)
      }
    } else {
      uni.showToast({ title: '人脸识别未通过', icon: 'none' })
      status.value = 'pending'
      step.value = 1
    }
  } catch (err) {
    console.error('人脸识别失败', err)
    uni.showToast({ title: '人脸识别失败', icon: 'none' })
    status.value = 'pending'
    step.value = 1
  }
}

async function submitCert() {
  // 切换到进件流程：将表单映射到草稿并提交为进件
  rejectReason.value = ''
  submitting.value = true
  status.value = 'checking'
  try {
    // 简单字段校验
    if (!isEnterprise.value) {
      if (!form.name || !form.id) { uni.showToast({ title: '请填写姓名和身份证号', icon: 'none' }); submitting.value = false; return }
      if (!(form.id_card_period_begin || '').trim() || !(form.id_card_period_end || '').trim()) {
        uni.showToast({ title: '请填写身份证有效期起止日期', icon: 'none' })
        submitting.value = false
        return
      }
      // 个人进件需上传身份证人像面、国徽面
      const hasIdFront = (form.idFrontList && form.idFrontList.length) || form.idFront
      const hasIdBack = (form.idBackList && form.idBackList.length) || form.idBack
      if (!hasIdFront || !hasIdBack) {
        uni.showToast({ title: '请上传身份证人像面、国徽面照片', icon: 'none' })
        submitting.value = false
        return
      }
    } else {
      if (!form.company_name || !form.credit_code) { uni.showToast({ title: '请填写企业名称与统一社会信用代码', icon: 'none' }); submitting.value = false; return }
      if (!(form.legal_name || '').trim() || !(form.legal_id || '').trim()) {
        uni.showToast({ title: '请填写法人姓名和法人身份证号', icon: 'none' })
        submitting.value = false
        return
      }
      if (!(form.id_card_period_begin || '').trim() || !(form.id_card_period_end || '').trim()) {
        uni.showToast({ title: '请填写法人身份证有效期起止日期', icon: 'none' })
        submitting.value = false
        return
      }
      const hasLegalFront = (form.legalFrontList && form.legalFrontList.length) || form.legalFront
      const hasLegalBack = (form.legalBackList && form.legalBackList.length) || form.legalBack
      if (!hasLegalFront || !hasLegalBack) {
        uni.showToast({ title: '请上传法人身份证人像面、国徽面照片', icon: 'none' })
        submitting.value = false
        return
      }
    }

    // build payload，identity_info 由上传后收集的 media_id 填充
    const subject_info = isEnterprise.value ? {
      company_name: form.company_name,
      credit_code: form.credit_code,
      register_address: form.register_address,
      business_category: form.business_category
    } : {
      name: form.name,
      id_number: form.id
    }
    const bank_account_info = {
      bank_name: form.bank_name,
      number: form.bank_account
    }

    // 超级管理员姓名必填，提前校验
    const contactName = (isEnterprise.value ? (form.agent_name || form.company_name || '') : (form.name || '')).trim()
    if (!contactName) {
      uni.showToast({ title: '请填写超级管理员姓名(个人填姓名/企业填经办人)', icon: 'none' })
      submitting.value = false
      return
    }
    const mobile = (form.mobile_phone || '').trim()
    if (!/^\d{11}$/.test(mobile)) {
      uni.showToast({ title: '请填写11位联系手机', icon: 'none' })
      submitting.value = false
      return
    }
    if (!(form.contact_email || '').trim()) {
      uni.showToast({ title: '请填写联系邮箱', icon: 'none' })
      submitting.value = false
      return
    }
    if (!(form.merchant_shortname || '').trim()) {
      uni.showToast({ title: '请填写商户简称', icon: 'none' })
      submitting.value = false
      return
    }
    const _contact = isEnterprise.value
      ? { contact_name: contactName, contact_id_number: (form.agent_id || '').trim(), mobile_phone: (form.mobile_phone || '').trim(), contact_email: (form.contact_email || '').trim() }
      : { contact_name: contactName, contact_id_number: (form.id || '').trim(), mobile_phone: (form.mobile_phone || '').trim(), contact_email: (form.contact_email || '').trim() }
    if (!currentApplyment.value) {
      currentApplyment.value = await createDraft({ subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL', subject_info, contact_info: _contact, bank_account_info })
    } else if (Number(currentApplyment.value.is_draft) === 1) {
      await updateDraft(currentApplyment.value.id, { subject_info, contact_info: _contact, bank_account_info })
    } else {
      currentApplyment.value = await createDraft({ subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL', subject_info, contact_info: _contact, bank_account_info })
    }

    // 提交前上传所有材料到进件媒体库，并收集 identity_info 所需的 media_id
    const applymentId = currentApplyment.value.applyment_id ?? currentApplyment.value.id
    const mediaIdMap = { id_card_front: '', id_card_back: '' }
    if (applymentId) {
      const fields = ['idFrontList', 'idBackList', 'licenseList', 'legalFrontList', 'legalBackList']
      const singleFields = ['idFront', 'idBack', 'license', 'legalFront', 'legalBack', 'agentAuth']
      const uploadOne = async (fp, mediaType) => {
        const path = typeof fp === 'string' ? fp : (fp?.path || fp?.url)
        if (!path) return null
        const res = await uploadMedia({ file: path, media_type: mediaType, applyment_id: applymentId })
        const mid = res?.media_id || res?.data?.media_id || (typeof res === 'string' ? res : null)
        if (mid && (mediaType === 'id_card_front' || mediaType === 'id_card_back')) {
          mediaIdMap[mediaType] = mid
        }
        return mid
      }
      try {
        for (const f of fields) {
          const arr = Array.isArray(form[f]) ? form[f] : []
          const mediaType = FIELD_TO_MEDIA_TYPE[f] || f
          for (const fp of arr) {
            await uploadOne(fp, mediaType)
          }
        }
        for (const f of singleFields) {
          const fp = form[f]
          if (!fp) continue
          const mediaType = FIELD_TO_MEDIA_TYPE[f] || f
          await uploadOne(fp, mediaType)
        }
      } catch (e) {
        console.error('材料上传失败', e)
        const is401 = /401|Unauthorized/i.test(String(e?.message || e))
        throw new Error(is401 ? '材料上传失败：服务器微信支付凭证未配置或已过期，请联系管理员' : '身份证人像面、国徽面等材料上传失败，请检查网络后重试')
      }
      // 若上传接口未返回 media_id，尝试从媒体列表按类型获取
      if ((!mediaIdMap.id_card_front || !mediaIdMap.id_card_back) && applymentId) {
        try {
          const list = await listMedia({ applyment_id: applymentId })
          const front = list.find(m => m.media_type === 'id_card_front' || (m.type && m.type === 'id_card_front'))
          const back = list.find(m => m.media_type === 'id_card_back' || (m.type && m.type === 'id_card_back'))
          if (front?.media_id && !mediaIdMap.id_card_front) mediaIdMap.id_card_front = front.media_id
          if (back?.media_id && !mediaIdMap.id_card_back) mediaIdMap.id_card_back = back.media_id
        } catch (e) { console.warn('从媒体列表获取 media_id 失败', e) }
      }
    }

    // 构建 identity_info（经营者/法定代表人身份证件，微信必填）
    const idCardName = (isEnterprise.value ? (form.legal_name || '').trim() : (form.name || '').trim()).replace(/\s+/g, ' ')
    const idCardNumber = (isEnterprise.value ? (form.legal_id || '').trim() : (form.id || '').trim()).toUpperCase()
    const idCardCopy = mediaIdMap.id_card_front
    const idCardNational = mediaIdMap.id_card_back

    if (!idCardName || idCardName.length < 2) {
      uni.showToast({ title: isEnterprise.value ? '请填写法人姓名（2-100字符）' : '请填写姓名（2-100字符）', icon: 'none' })
      submitting.value = false
      return
    }
    if (!idCardNumber) {
      uni.showToast({ title: '请填写身份证号', icon: 'none' })
      submitting.value = false
      return
    }

    let periodBegin = (form.id_card_period_begin || '').trim() || '2000-01-01'
    let periodEnd = (form.id_card_period_end || '').trim() || '9999-12-31'
    if (periodBegin === '长期' || periodBegin === '永久') periodBegin = '2000-01-01'
    if (periodEnd === '长期' || periodEnd === '永久') periodEnd = '9999-12-31'

    const identity_info = {
      id_holder_type: 'LEGAL',
      id_doc_type: 'IDENTIFICATION_TYPE_IDCARD',
      id_card_info: {
        id_card_name: idCardName,
        id_card_number: idCardNumber,
        id_card_copy: idCardCopy,
        id_card_national: idCardNational,
        card_period_begin: periodBegin,
        card_period_end: periodEnd
      }
    }
    if (subject_info) subject_info.identity_info = identity_info

    if (!idCardCopy || !idCardNational) {
      console.warn('[submitApplyment] identity_info 缺少 media_id，后端需从上传材料中填充 id_card_copy/id_card_national')
    }
    console.log('[submitApplyment] 传给后端的完整请求数据:', JSON.stringify({ subject_info, contact_info, bank_account_info }))

    // submit（后端需完整结构，contact_name、identity_info 必填）
    const contact_info = isEnterprise.value
      ? { contact_name: contactName, contact_id_number: (form.agent_id || '').trim(), mobile_phone: (form.mobile_phone || '').trim(), contact_email: (form.contact_email || '').trim() }
      : { contact_name: contactName, contact_id_number: (form.id || '').trim(), mobile_phone: (form.mobile_phone || '').trim(), contact_email: (form.contact_email || '').trim() }
    const business_info = (form.merchant_shortname || '').trim()
      ? { merchant_shortname: (form.merchant_shortname || '').trim() }
      : null
    // 结算规则：前端有就用前端的，后端有就用后端的；都没有时传 null，由后端在转发微信前填充
    let settleRuleId = (config.wechatSettleRuleId || '').trim()
    if (!settleRuleId) {
      try {
        const cfg = await getApplymentConfig()
        const rid = cfg?.settle_rule_id ?? cfg?.settlement_info?.settle_rule_id
        if (rid != null && rid !== '') settleRuleId = String(rid)
      } catch (e) { /* 后端未实现 config 时忽略 */ }
    }
    const settlement_info = settleRuleId ? { settle_rule_id: settleRuleId } : null
    if (!settleRuleId) {
      console.warn('[进件] 前端与后端 config 均未提供 settle_rule_id，将不传 settlement_info，由后端在 POST /wechat-applyment/submit 转发微信前填充')
    }
    const res = await submitApplyment({
      id: currentApplyment.value.id,
      applyment_id: currentApplyment.value.applyment_id ?? currentApplyment.value.id,
      subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL',
      subject_info,
      contact_info,
      bank_account_info,
      business_info,
      settlement_info,
      business_category_locked: false
    })
    currentApplyment.value = res
    submitting.value = false
    const state = res?.applyment_state || res?.status
    if (state === 'APPLYMENT_STATE_FINISHED') {
      status.value = 'approved'
      saveStatusMeta('approved')
      uni.showToast({ title: '进件已通过', icon: 'success' })
    } else if (state === 'APPLYMENT_STATE_REJECTED') {
      status.value = 'rejected'
      rejectReason.value = res?.applyment_state_msg || res?.reject_reason || '被驳回'
      saveStatusMeta('rejected', rejectReason.value)
      uni.showToast({ title: rejectReason.value || '进件被驳回', icon: 'none' })
    } else {
      status.value = 'under_review'
      saveStatusMeta('submitted')
      uni.showToast({ title: '提交成功', icon: 'success' })
    }
    // load media list for display
    await loadApplymentMedia()
    // switch to status view
    step.value = 2
  } catch (err) {
    console.error('提交进件失败', err)
    submitting.value = false
    status.value = 'pending'
    let msg = err?.message || err?.errorMsg || '提交失败'
    if (typeof msg === 'string' && /401|Unauthorized|凭证未配置|凭证.*过期/.test(msg)) {
      msg = '材料上传失败：服务器微信支付凭证未配置或已过期，请联系管理员'
    } else if (typeof msg === 'string' && /缺少必要的材料|id_card/.test(msg)) {
      msg = '请先上传身份证人像面、国徽面照片'
    } else if (typeof msg === 'string' && /identity_info|经营者|法定代表人|身份证件/.test(msg)) {
      msg = '身份证件信息不完整，请确保已上传人像面、国徽面并填写正确姓名和身份证号'
    } else if (typeof msg === 'string' && /settlement_info|结算规则/.test(msg)) {
      msg = '结算规则配置缺失，请联系平台管理员配置 settle_rule_id'
    }
    const d0 = Array.isArray(err?.detail) ? err.detail[0] : null
    const field = d0?.loc?.slice(-1)?.[0]
    if (field) msg = `缺少必填项: ${field}`
    else if (d0?.msg) msg = d0.msg
    uni.showToast({ title: typeof msg === 'string' ? msg : '提交失败', icon: 'none' })
  }
}

async function saveDraft() {
  // 保存当前表单为草稿（优先同步到远端，失败时回退到 wechat_applyment 接口）
  savingDraft.value = true
  try {
    const subject_info = isEnterprise.value ? {
      company_name: form.company_name,
      credit_code: form.credit_code,
      register_address: form.register_address,
      business_category: form.business_category,
      identity_info: {
        id_holder_type: 'LEGAL',
        id_doc_type: 'IDENTIFICATION_TYPE_IDCARD',
        id_card_info: {
          id_card_name: (form.legal_name || '').trim(),
          id_card_number: (form.legal_id || '').trim().toUpperCase()
        }
      }
    } : {
      identity_info: {
        id_holder_type: 'LEGAL',
        id_doc_type: 'IDENTIFICATION_TYPE_IDCARD',
        id_card_info: {
          id_card_name: (form.name || '').trim(),
          id_card_number: (form.id || '').trim().toUpperCase()
        }
      }
    }

    const bank_account_info = isEnterprise.value ? {
      account_type: 'ACCOUNT_TYPE_PUBLIC',
      bank_name: form.bank_name || '',
      account_number: form.bank_account || '',
      account_name: isEnterprise.value ? form.company_name || '' : form.name || '',
      account_bank: '',
      bank_address_code: ''
    } : {
      account_type: 'ACCOUNT_TYPE_PRIVATE',
      bank_name: form.bank_name || '',
      account_number: form.bank_account || '',
      account_name: form.name || '',
      account_bank: '',
      bank_address_code: ''
    }

    const contact_info = isEnterprise.value ? {
      contact_name: (form.agent_name || form.company_name || '').trim(),
      contact_id_number: form.agent_id || '',
      mobile_phone: form.mobile_phone || '',
      contact_email: form.contact_email || ''
    } : {
      contact_name: (form.name || '').trim(),
      contact_id_number: form.id || '',
      mobile_phone: form.mobile_phone || '',
      contact_email: form.contact_email || ''
    }

    const payload = {
      applyment_id: 0,
      subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL',
      subject_info,
      contact_info,
      bank_account_info,
      business_category_locked: false
    }

    // 先尝试远端保存
    try {
      const resp = await createWechatApplymentDraft(payload)
      if (resp) {
        currentApplyment.value = resp
        saveFormToStorage()
        uni.showToast({ title: '草稿已保存（已同步至服务器）', icon: 'success' })
        savingDraft.value = false
        return
      }
    } catch (remoteErr) {
      console.warn('远程保存草稿失败，将回退到本地保存', remoteErr)
    }

    // 远端失败则回退到 wechat_applyment 接口
    let rec = null
    if (!currentApplyment.value) {
      rec = await createDraft({ subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL', subject_info, contact_info, bank_account_info })
      currentApplyment.value = rec
    } else if (Number(currentApplyment.value.is_draft) === 1) {
      rec = await updateDraft(currentApplyment.value.id, { subject_info, contact_info, bank_account_info })
      currentApplyment.value = rec
    } else {
      rec = await createDraft({ subject_type: isEnterprise.value ? 'SUBJECT_TYPE_COMPANY' : 'SUBJECT_TYPE_INDIVIDUAL', subject_info, contact_info, bank_account_info })
      currentApplyment.value = rec
    }

    // 上传已选图片到远端媒体库（避免重复上传）
    try {
      const applymentId = currentApplyment.value && (currentApplyment.value.id || currentApplyment.value.applyment_id)
      if (applymentId) {
        // 获取已有媒体，避免重复上传
        let existing = []
        try { existing = await listMedia({ applyment_id: applymentId }) } catch (e) { existing = [] }

        const fields = ['idFrontList','idBackList','licenseList','legalFrontList','legalBackList']
        const singleFields = ['idFront','idBack','license','legalFront','legalBack','agentAuth']

        for (const f of fields) {
          const arr = Array.isArray(form[f]) ? form[f] : []
          const mediaType = FIELD_TO_MEDIA_TYPE[f] || f
          for (const fp of arr) {
            try {
              const path = typeof fp === 'string' ? fp : (fp?.path || fp?.url)
              if (path) await uploadMedia({ file: path, media_type: mediaType, applyment_id: applymentId })
            } catch (e) { console.warn('upload media failed for', f, fp, e) }
          }
        }

        for (const f of singleFields) {
          const fp = form[f]
          if (!fp) continue
          try {
            const mediaType = FIELD_TO_MEDIA_TYPE[f] || f
            await uploadMedia({ file: fp, media_type: mediaType, applyment_id: applymentId })
          } catch (e) { console.warn('upload media failed for', f, fp, e) }
        }
      }
    } catch (e) { console.warn('batch upload media failed', e) }

    saveFormToStorage()
    uni.showToast({ title: '草稿已保存（本地）', icon: 'success' })
  } catch (e) {
    console.error('保存草稿失败', e)
    uni.showToast({ title: e && e.message ? e.message : '保存失败', icon: 'none' })
  } finally {
    savingDraft.value = false
  }
}

async function loadApplymentMedia() {
  try {
    if (!currentApplyment.value) return mediaList.value = []
    const list = await listMedia({ applyment_id: currentApplyment.value.id })
    mediaList.value = list || []
  } catch (e) { console.warn('load media failed', e); mediaList.value = [] }
}

async function refreshApplyment() {
  try {
    if (!currentApplyment.value) return
    const fresh = await getApplymentById(currentApplyment.value.id)
    if (fresh) currentApplyment.value = fresh
    // 根据后端真实状态更新（不再依赖模拟事件）
    if (fresh) {
      if (fresh.applyment_state === 'APPLYMENT_STATE_FINISHED') {
        status.value = 'approved'
        submitting.value = false
        saveStatusMeta('approved')
      } else if (fresh.applyment_state === 'APPLYMENT_STATE_REJECTED') {
        status.value = 'rejected'
        submitting.value = false
        rejectReason.value = fresh.applyment_state_msg || fresh.reject_reason || '被驳回'
        saveStatusMeta('rejected', rejectReason.value)
      } else if (fresh.applyment_state === 'APPLYMENT_STATE_AUDITING') {
        status.value = 'under_review'
      }
    }
    await loadApplymentMedia()
  } catch (e) { console.warn('refresh failed', e) }
}

function previewMediaItem(item) {
  try {
    const url = item && (item.url || item.file_url)
    if (url) uni.previewImage({ urls: [url], current: url })
  } catch (e) { console.warn(e) }
}

const statusText = computed(() => {
  if (status.value === 'pending') return '待提交'
  if (status.value === 'checking') return '自动校验中'
  if (status.value === 'under_review') return '人工复核中'
  if (status.value === 'submitted' || status.value === 'approved') return '已通过'
  if (status.value === 'rejected') return '已驳回'
  if (status.value === 'auto_rejected') return '自动驳回'
  return ''
})

// 允许从状态页返回编辑（保留数据）
function editAfterSubmit() {
  step.value = 1
}

// 保存审核状态到本地，用于展示
function saveStatusMeta(newStatus, reason, suggestions) {
  const meta = {
    status: newStatus,
    reason: reason || '',
    suggestions: suggestions || '',
    updated_at: new Date().toLocaleString()
  }
  uni.setStorageSync('cert_status_meta', meta)
  statusMetaRef.value = meta
}

const statusMetaRef = ref(uni.getStorageSync('cert_status_meta') || null)
const statusMeta = statusMetaRef
</script>


<style scoped>
@import "@/static/999/iconfont.css";

.cert-container {
  padding: 24rpx 0 40rpx;
  box-sizing: border-box;
}

.cert-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
}

.section-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.section-label .optional {
  font-weight: 400;
  color: #999;
  font-size: 26rpx;
}

.form-item {
  margin-bottom: 28rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  text-align: center;
}

.form-input:focus {
  background: #fff;
  border-color: #3d6bff;
}

.placeholder {
  color: #bbb;
}

.picker-input.placeholder {
  color: #bbb;
}

/* 上传区域：统一 box-sizing，左右留白一致 */
.upload-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
  box-sizing: border-box;
}

.upload-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.upload-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.upload-requirement {
  text-align: center;
  margin-bottom: 24rpx;
}
.upload-requirement-text {
  font-size: 22rpx;
  color: #999;
}
.upload-requirement-red {
  color: #e64545;
  font-weight: 500;
}

/* 身份证两列：用 grid 等分，避免右偏 */
.upload-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32rpx;
  width: 100%;
  box-sizing: border-box;
}

/* 身份证照片：一个图片占一行，展示区域做大 */
.id-card-upload .id-card-row {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  grid-template-columns: unset;
}
.id-card-upload .id-card-row .upload-col {
  width: 100%;
}
.id-card-upload .id-card-row .upload-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 20rpx;
}
.id-card-upload .id-card-row .upload-box {
  width: 100%;
  height: 360rpx;
  min-height: 360rpx;
}
.id-card-upload .id-card-row .upload-box.add:not(.replace) {
  width: 100%;
  height: 360rpx;
  min-height: 360rpx;
}
.id-card-upload .id-card-row .upload-box.add.replace {
  width: 100%;
  height: 72rpx;
  min-height: 72rpx;
}
.id-card-upload .id-card-row .upload-col-label {
  font-size: 28rpx;
  margin-bottom: 16rpx;
}

/* 证照三列：用 grid 等分，左右留白一致 */
.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24rpx;
  width: 100%;
  box-sizing: border-box;
}

.upload-col {
  min-width: 0;
  box-sizing: border-box;
}

.upload-col-label {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.upload-box {
  width: 160rpx;
  height: 160rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
  border: 2rpx dashed #d0d5dd;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.upload-box.add {
  color: #3d6bff;
  border-color: #b8c8ff;
}

.upload-box.add:active {
  background: #e8eeff;
}

.upload-box.has-img {
  position: relative;
  padding: 0;
  overflow: hidden;
  border-style: solid;
  border-color: #e8e8e8;
}

.upload-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14rpx;
}

.upload-remove {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 44rpx;
  height: 44rpx;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-remove .iconfont {
  font-size: 24rpx;
  color: #fff;
}

.upload-icon {
  font-size: 48rpx !important;
  margin-bottom: 8rpx;
}

.upload-add-text {
  font-size: 22rpx;
  color: #3d6bff;
}

.upload-box.add.replace {
  width: 120rpx;
  height: 56rpx;
  padding: 0 16rpx;
}

.upload-box.add.replace .upload-add-text {
  font-size: 24rpx;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-box.single {
  width: 100%;
  height: 200rpx;
}

.upload-single {
  margin-top: 20rpx;
}

.upload-single .form-label {
  margin-bottom: 12rpx;
}

.agent-card {
  margin-top: 0;
}

/* 操作按钮 - 与商品详情页底部按钮风格一致 */
.action-btns {
  display: flex;
  gap: 24rpx;
  margin-top: 48rpx;
  padding: 0 8rpx;
}

.action-btns .btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}

.btn-draft {
  background: #ff9800;
  color: #fff;
}

.btn-draft:active:not(.disabled) {
  background: #e68900;
}

.btn-submit {
  background: #ff4757;
  color: #fff;
}

.btn-submit:active:not(.disabled) {
  background: #e63e4d;
}

.btn-draft.disabled,
.btn-submit.disabled {
  opacity: 0.5;
}

/* 状态页 */
.status-box {
  padding: 40rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-top: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.06);
}

.status-actions {
  margin-top: 24rpx;
}

.status-actions .edit {
  background: #f5f6f8;
  border-radius: 48rpx;
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #3d6bff;
}
</style>
