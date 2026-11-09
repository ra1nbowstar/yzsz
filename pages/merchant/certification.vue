<template>
  <view class="cert-container">
    <!-- 类型选择模态框 -->
    <view v-if="showTypeModal" class="type-modal-mask" @tap="closeTypeModal">
      <view class="type-modal" @tap.stop>
        <view class="type-modal-header">
          <text class="type-modal-title">选择认证类型</text>
          <view class="type-modal-close" @tap="closeTypeModal" hover-class="type-close-hover">
            <text class="type-close-icon">×</text>
          </view>
        </view>
        <view class="type-modal-content">
          <view class="type-option type-personal" @tap="selectType('personal')" hover-class="type-option-hover">
            <view class="type-option-icon">👤</view>
            <text class="type-option-text">个人认证</text>
            <text class="type-option-desc">个体工商户 / 个人经营者</text>
          </view>
          <view class="type-option type-enterprise" @tap="selectType('enterprise')" hover-class="type-option-hover">
            <view class="type-option-icon">🏢</view>
            <text class="type-option-text">企业认证</text>
            <text class="type-option-desc">企业 / 公司主体</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 表单页面 -->
    <view v-if="step === 1" class="cert-form">
      <view class="form-title">实名认证</view>
      
      <!-- 个人认证表单 -->
      <view v-if="!isEnterprise" class="form-section">
        <view class="input-group">
          <input class="input" v-model="form.name" placeholder="姓名" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.id" placeholder="身份证号" />
        </view>
        <view class="input-group">
          <picker mode="date" :value="form.id_card_period_begin" @change="e => form.id_card_period_begin = e.detail.value">
            <view class="input picker-input">{{ form.id_card_period_begin || '身份证有效期起（请选择）' }}</view>
          </picker>
        </view>
        <view class="input-group">
          <picker mode="date" :value="form.id_card_period_end" @change="e => form.id_card_period_end = e.detail.value">
            <view class="input picker-input">{{ form.id_card_period_end || '身份证有效期止（请选择）' }}</view>
          </picker>
        </view>
        <view class="input-group">
          <input class="input" v-model="form.merchant_shortname" placeholder="商户简称（1-64字，必填）" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.mobile_phone" placeholder="联系手机（超级管理员）" type="number" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.contact_email" placeholder="联系邮箱（超级管理员）" type="text" />
        </view>
        <view class="upload-group">
          <text class="upload-label">上传身份证人像面/国徽面（支持多图、支持预览/删除）</text>
          <view class="upload-row">
            <view class="upload-list">
              <view v-for="(img, idx) in form.idFrontList" :key="'f' + idx" class="upload-box">
                <image class="img" :src="img" mode="aspectFit" @tap="previewImage(form.idFrontList, idx)" />
                <view class="remove" @tap.stop="removeImage(form.idFrontList, idx)">×</view>
              </view>
              <view class="upload-box add" @tap="uploadImg('idFrontList')">
                <text>+</text>
              </view>
            </view>
            <view class="upload-list">
              <view v-for="(img, idx) in form.idBackList" :key="'b' + idx" class="upload-box">
                <image class="img" :src="img" mode="aspectFit" @tap="previewImage(form.idBackList, idx)" />
                <view class="remove" @tap.stop="removeImage(form.idBackList, idx)">×</view>
              </view>
              <view class="upload-box add" @tap="uploadImg('idBackList')">
                <text>+</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 企业认证表单 -->
      <view v-else class="form-section">
        <view class="input-group">
          <input class="input" v-model="form.company_name" placeholder="企业名称" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.credit_code" placeholder="统一社会信用代码" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.register_address" placeholder="注册地址" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.business_category" placeholder="经营类目" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.legal_name" placeholder="法人姓名（营业执照上的法定代表人）" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.legal_id" placeholder="法人身份证号" type="idcard" />
        </view>
        <view class="input-group">
          <picker mode="date" :value="form.id_card_period_begin" @change="e => form.id_card_period_begin = e.detail.value">
            <view class="input picker-input">{{ form.id_card_period_begin || '法人身份证有效期起（请选择）' }}</view>
          </picker>
        </view>
        <view class="input-group">
          <picker mode="date" :value="form.id_card_period_end" @change="e => form.id_card_period_end = e.detail.value">
            <view class="input picker-input">{{ form.id_card_period_end || '身份证有效期止（请选择）' }}</view>
          </picker>
        </view>
        <view class="input-group">
          <input class="input" v-model="form.merchant_shortname" placeholder="商户简称（1-64字，必填）" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.mobile_phone" placeholder="联系手机（超级管理员）" type="number" />
        </view>
        <view class="input-group">
          <input class="input" v-model="form.contact_email" placeholder="联系邮箱（超级管理员）" type="text" />
        </view>
        <view class="upload-group">
          <text class="upload-label">上传营业执照/法人身份证人像面、国徽面/授权书(可选)</text>
          <view class="upload-row">
            <view class="upload-list">
              <view v-for="(img, idx) in form.licenseList" :key="'l' + idx" class="upload-box">
                <image class="img" :src="img" mode="aspectFit" @tap="previewImage(form.licenseList, idx)" />
                <view class="remove" @tap.stop="removeImage(form.licenseList, idx)">×</view>
              </view>
              <view class="upload-box add" @tap="uploadImg('licenseList')">
                <text class="upload-label-text">执照+</text>
              </view>
            </view>
            <view class="upload-list">
              <view v-for="(img, idx) in form.legalFrontList" :key="'lf' + idx" class="upload-box">
                <image class="img" :src="img" mode="aspectFit" @tap="previewImage(form.legalFrontList, idx)" />
                <view class="remove" @tap.stop="removeImage(form.legalFrontList, idx)">×</view>
              </view>
              <view class="upload-box add" @tap="uploadImg('legalFrontList')">
                <text class="upload-label-text">法人人像面</text>
              </view>
            </view>
            <view class="upload-list">
              <view v-for="(img, idx) in form.legalBackList" :key="'lb' + idx" class="upload-box">
                <image class="img" :src="img" mode="aspectFit" @tap="previewImage(form.legalBackList, idx)" />
                <view class="remove" @tap.stop="removeImage(form.legalBackList, idx)">×</view>
              </view>
              <view class="upload-box add" @tap="uploadImg('legalBackList')">
                <text class="upload-label-text">法人国徽面</text>
              </view>
            </view>
          </view>
        </view>
        <view class="bank-group">
          <view class="input-group">
            <input class="input" v-model="form.bank_name" placeholder="对公银行名称" />
          </view>
          <view class="input-group">
            <input class="input" v-model="form.bank_account" placeholder="对公账户(账号)" />
          </view>
        </view>
        <view class="agent-group">
          <text class="section-label">经办人(可选)</text>
          <view class="input-group">
            <input class="input" v-model="form.agent_name" placeholder="经办人姓名" />
          </view>
          <view class="input-group">
            <input class="input" v-model="form.agent_id" placeholder="经办人证件号" />
          </view>
          <view class="upload-box single" @tap="uploadImg('agentAuth')">
            <image class="img" v-if="form.agentAuth" :src="form.agentAuth" mode="aspectFit" />
            <text v-else class="upload-label-text">授权书</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-buttons">
        <button class="btn-save" :class="{ disabled: savingDraft }" :disabled="savingDraft" @tap="saveDraft">
          {{ savingDraft ? '保存中...' : '保存草稿' }}
        </button>
        <button class="btn-submit" :class="{ disabled: submitting }" :disabled="submitting" @tap="submitCert">
          {{ submitting ? '审核中...' : '提交审核' }}
        </button>
      </view>
    </view>

    <!-- 状态页面 -->
    <view v-if="step === 2" class="status-box">
      <text class="status-title">{{ statusText }}</text>
      <text v-if="statusMeta && statusMeta.updated_at" class="status-time">提交时间：{{ statusMeta.updated_at }}</text>
      <text v-if="rejectReason" class="status-reason">驳回原因：{{ rejectReason }}</text>
      <view v-if="statusMeta && statusMeta.suggestions" class="status-suggest">建议：{{ statusMeta.suggestions }}</view>

      <view class="applyment-detail" v-if="currentApplyment">
        <view class="detail-row">
          <text class="label">业务编号：</text>
          <text>{{ currentApplyment.business_code || currentApplyment.id }}</text>
        </view>
        <view class="detail-row">
          <text class="label">进件ID：</text>
          <text>{{ currentApplyment.applyment_id || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="label">子商户号：</text>
          <text>{{ currentApplyment.sub_mchid || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="label">主体类型：</text>
          <text>{{ currentApplyment.subject_type }}</text>
        </view>
        <view class="detail-row">
          <text class="label">提交时间：</text>
          <text>{{ currentApplyment.submitted_at || currentApplyment.created_at || '-' }}</text>
        </view>
        <view class="detail-row">
          <text class="label">最新状态：</text>
          <text>{{ currentApplyment.applyment_state_msg || currentApplyment.applyment_state }}</text>
        </view>
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
          <button class="btn-refresh" @tap="refreshApplyment">刷新进件状态</button>
        </view>
      </view>

      <view class="status-actions">
        <button v-if="status === 'rejected' || status === 'auto_rejected'" class="btn-edit" @tap="editAfterSubmit">
          修改并重新提交
        </button>
        <button v-if="status === 'under_review' || status === 'checking'" class="btn-refresh" @tap="refreshApplyment">
          查看进度 / 刷新
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { 
  faceVerify, 
  verifyPersonal, 
  verifyEnterprise, 
  createWechatApplymentDraft
} from '@/api/merchant.js'
import { createDraft, updateDraft, listApplyments, submitApplyment, uploadMedia, listMedia, getApplymentById } from '@/api/wechat_applyment.js'

const isEnterprise = computed(() => type.value === 'enterprise')


// 表单字段 -> 后端 media_type 映射（后端要求 id_card_front / id_card_back 等）
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
const showTypeModal = ref(false)

const form = reactive({
  // 个人
  name: '',
  id: '',
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
  id_card_period_begin: '',
  id_card_period_end: '',
  agentAuth: '',
  merchant_shortname: '',
  mobile_phone: '',
  contact_email: ''
})

const currentApplyment = ref(null)
const mediaList = ref([])

function _mapDraftToForm(rec) {
  if (!rec) return
  try {
    const s = rec.subject_info || {}
    const b = rec.bank_account_info || {}
    const c = rec.contact_info || {}
    // map common fields if present
    if (s.name) form.name = s.name
    if (s.id_number) form.id = s.id_number
    if (s.company_name) form.company_name = s.company_name
    if (s.credit_code) form.credit_code = s.credit_code
    if (s.register_address) form.register_address = s.register_address
    if (s.business_category) form.business_category = s.business_category
    const idCard = s.identity_info?.id_card_info || s.identity_info || {}
    if (idCard.id_card_name) {
      if (type.value === 'enterprise') form.legal_name = idCard.id_card_name
      else form.name = idCard.id_card_name
    }
    if (idCard.id_card_number) {
      if (type.value === 'enterprise') form.legal_id = idCard.id_card_number
      else form.id = idCard.id_card_number
    }
    if (idCard.card_period_begin) form.id_card_period_begin = idCard.card_period_begin
    if (idCard.card_period_end) form.id_card_period_end = (idCard.card_period_end === '9999-12-31' || idCard.card_period_end === '长期') ? '2099-12-31' : idCard.card_period_end
    if (b.number || b.account_number) form.bank_account = b.number || b.account_number
    if (b.bank_name) form.bank_name = b.bank_name
    if (c.contact_name && isEnterprise.value) form.agent_name = c.contact_name
    if (c.contact_id_number && isEnterprise.value) form.agent_id = c.contact_id_number
    if (c.mobile_phone) form.mobile_phone = c.mobile_phone
    if (c.contact_email) form.contact_email = c.contact_email
  } catch (e) { console.warn('map draft failed', e) }
}

function selectType(t) {
  type.value = t
  step.value = 1
  status.value = 'pending'
  rejectReason.value = ''
  showTypeModal.value = false
  uni.setStorageSync('cert_last_type', t)
  // 加载对应类型的本地表单数据
  loadFormFromStorage(t)
}

function closeTypeModal() {
  showTypeModal.value = false
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
      payload.merchant_shortname = form.merchant_shortname
      payload.mobile_phone = form.mobile_phone
      payload.contact_email = form.contact_email
    } else {
      payload.company_name = form.company_name
      payload.merchant_shortname = form.merchant_shortname
      payload.mobile_phone = form.mobile_phone
      payload.contact_email = form.contact_email
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
    } else {
      // 如果没有选择类型，显示类型选择模态框
      showTypeModal.value = true
    }
    // 加载本地表单数据（以确定 type 为准）
    loadFormFromStorage(type.value)
  } catch (e) {
    console.warn('初始化认证类型失败', e)
    const lastType = uni.getStorageSync('cert_last_type')
    if (lastType) {
      type.value = lastType
      step.value = 1
    } else {
      showTypeModal.value = true
    }
    loadFormFromStorage(type.value)
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
        // 根据草稿设置类型
        if (currentApplyment.value.subject_type === 'SUBJECT_TYPE_ENTERPRISE') {
          type.value = 'enterprise'
        } else {
          type.value = 'personal'
        }
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
          } else if (rec.applyment_state === 'APPLYMENT_STATE_AUDITING') {
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
    // 如果目标字段是列表，push，否则覆盖
    if (field.endsWith('List')) {
      form[field].push(tempPath)
    } else {
      form[field] = tempPath
    }
    // 上传图片
    // 如果存在草稿或未创建草稿，则上传到 applyment 媒体库（需传本地路径给 uni.uploadFile）
    try {
      // ensure there is a draft
      if (!currentApplyment.value) {
        const draftData = buildDraftPayload()
        try {
          currentApplyment.value = await createWechatApplymentDraft(draftData)
        } catch (e) {
          console.warn('远程创建草稿失败，使用本地', e)
          currentApplyment.value = await createDraft({ 
            subject_type: isEnterprise.value ? 'SUBJECT_TYPE_ENTERPRISE' : 'SUBJECT_TYPE_INDIVIDUAL',
            subject_info: {}, 
            contact_info: {}, 
            bank_account_info: {} 
          })
        }
      }
      const applymentId = currentApplyment.value.applyment_id ?? currentApplyment.value.id
      if (applymentId) {
        const mediaType = FIELD_TO_MEDIA_TYPE[field] || field
        await uploadMedia({ file: tempPath, media_type: mediaType, applyment_id: applymentId })
      }
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

// 构建草稿数据
function buildDraftPayload() {
  const subject_info = isEnterprise.value ? {
    company_name: form.company_name || '',
    credit_code: form.credit_code || '',
    register_address: form.register_address || '',
    business_category: form.business_category || ''
  } : {
    name: form.name || '',
    id_number: form.id || ''
  }

  const bank_account_info = {
    bank_name: form.bank_name || '',
    number: form.bank_account || '',
    account_name: isEnterprise.value ? form.company_name || '' : form.name || ''
  }

  const contact_info = isEnterprise.value ? {
    contact_name: form.agent_name || form.company_name || '',
    contact_id_number: form.agent_id || '',
    mobile_phone: form.mobile_phone || '',
    contact_email: form.contact_email || ''
  } : {
    contact_name: form.name || '',
    contact_id_number: form.id || '',
    mobile_phone: form.mobile_phone || '',
    contact_email: form.contact_email || ''
  }

  return {
    subject_type: isEnterprise.value ? 'SUBJECT_TYPE_ENTERPRISE' : 'SUBJECT_TYPE_INDIVIDUAL',
    subject_info,
    contact_info,
    bank_account_info
  }
}

// A draft is complete only after all selected evidence uploads are acknowledged.
async function saveDraft() {
  savingDraft.value = true
  try {
    const payload = buildDraftPayload()
    const rec = currentApplyment.value && Number(currentApplyment.value.is_draft) === 1
      ? await updateDraft(currentApplyment.value.id || currentApplyment.value.applyment_id, payload)
      : await createDraft(payload)
    currentApplyment.value = rec
    const applymentId = rec.id || rec.applyment_id
    if (!applymentId) throw new Error('未获取服务端草稿编号')
    const fields = ['idFrontList', 'idBackList', 'licenseList', 'legalFrontList', 'legalBackList']
    const singleFields = ['idFront', 'idBack', 'license', 'legalFront', 'legalBack', 'agentAuth']
    for (const field of fields) {
      for (const file of (Array.isArray(form[field]) ? form[field] : [])) {
        await uploadMedia({ file, media_type: FIELD_TO_MEDIA_TYPE[field] || field, applyment_id: applymentId })
      }
    }
    for (const field of singleFields) {
      if (form[field]) {
        await uploadMedia({ file: form[field], media_type: FIELD_TO_MEDIA_TYPE[field] || field, applyment_id: applymentId })
      }
    }
    saveFormToStorage()
    uni.showToast({ title: '草稿及所选材料已保存', icon: 'success' })
  } catch {
    uni.showModal({ title: '草稿或材料保存未完成', content: '材料上传未确认，请保留当前资料并重试；不能视为材料已保存或实名已核验。', showCancel: false })
  } finally {
    savingDraft.value = false
  }
}

// 提交审核
async function submitCert() {
  rejectReason.value = ''
  submitting.value = true
  status.value = 'checking'
  try {
    // 字段校验
    if (!isEnterprise.value) {
      if (!form.name || !form.id) {
        uni.showToast({ title: '请填写姓名和身份证号', icon: 'none' })
        submitting.value = false
        return
      }
      if (!(form.id_card_period_begin || '').trim() || !(form.id_card_period_end || '').trim()) {
        uni.showToast({ title: '请填写身份证有效期起止日期', icon: 'none' })
        submitting.value = false
        return
      }
      const hasIdFront = (form.idFrontList && form.idFrontList.length) || form.idFront
      const hasIdBack = (form.idBackList && form.idBackList.length) || form.idBack
      if (!hasIdFront || !hasIdBack) {
        uni.showToast({ title: '请上传身份证人像面、国徽面照片', icon: 'none' })
        submitting.value = false
        return
      }
    } else {
      if (!form.company_name || !form.credit_code) {
        uni.showToast({ title: '请填写企业名称与统一社会信用代码', icon: 'none' })
        submitting.value = false
        return
      }
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
    if (!(form.merchant_shortname || '').trim()) {
      uni.showToast({ title: '请填写商户简称', icon: 'none' })
      submitting.value = false
      return
    }
    if (!form.mobile_phone || !form.contact_email) {
      uni.showToast({ title: '请填写联系手机和邮箱', icon: 'none' })
      submitting.value = false
      return
    }

    const payload = buildDraftPayload()
    const contactName = (payload.contact_info?.contact_name || '').trim()
    if (!contactName) {
      uni.showToast({ title: '请填写超级管理员姓名(contact_name)', icon: 'none' })
      submitting.value = false
      return
    }

    // 确保有草稿
    if (!currentApplyment.value) {
      try {
        currentApplyment.value = await createWechatApplymentDraft(payload)
      } catch (e) {
        console.warn('远程创建草稿失败，使用本地', e)
        currentApplyment.value = await createDraft(payload)
      }
    } else if (Number(currentApplyment.value.is_draft) === 1) {
      try {
        await createWechatApplymentDraft({ ...payload, id: currentApplyment.value.id })
      } catch (e) {
        console.warn('远程更新草稿失败，使用本地', e)
        await updateDraft(currentApplyment.value.id, payload)
      }
    } else {
      try {
        currentApplyment.value = await createWechatApplymentDraft(payload)
      } catch (e) {
        console.warn('远程创建草稿失败，使用本地', e)
        currentApplyment.value = await createDraft(payload)
      }
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
          for (const fp of arr) await uploadOne(fp, mediaType)
        }
        for (const f of singleFields) {
          const fp = form[f]
          if (!fp) continue
          await uploadOne(fp, FIELD_TO_MEDIA_TYPE[f] || f)
        }
      } catch (e) {
        console.error('材料上传失败', e)
        const is401 = /401|Unauthorized/i.test(String(e?.message || e))
        throw new Error(is401 ? '材料上传失败：服务器微信支付凭证未配置或已过期，请联系管理员' : '身份证人像面、国徽面等材料上传失败，请检查网络后重试')
      }
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

    const periodBegin = (form.id_card_period_begin || '').trim() || '2000-01-01'
    let periodEnd = (form.id_card_period_end || '').trim() || '9999-12-31'
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
    payload.subject_info = payload.subject_info || {}
    payload.subject_info.identity_info = identity_info

    const business_info = (form.merchant_shortname || '').trim()
      ? { merchant_shortname: (form.merchant_shortname || '').trim() }
      : null

    // 提交审核（后端需完整结构，含 identity_info）
    const res = await submitApplyment({
      id: currentApplyment.value.id || currentApplyment.value.applyment_id,
      applyment_id: currentApplyment.value.applyment_id ?? currentApplyment.value.id,
      ...payload,
      business_info,
      business_category_locked: false
    })
    currentApplyment.value = res

    submitting.value = false
    const raw = res?.data || res
    const state = raw?.applyment_state || raw?.status
    if (state === 'APPLYMENT_STATE_FINISHED') {
      status.value = 'approved'
      saveStatusMeta('approved')
      uni.showToast({ title: '进件已通过', icon: 'success' })
    } else if (state === 'APPLYMENT_STATE_REJECTED') {
      status.value = 'rejected'
      rejectReason.value = raw?.applyment_state_msg || raw?.reject_reason || '被驳回'
      saveStatusMeta('rejected', rejectReason.value)
      uni.showToast({ title: rejectReason.value || '进件被驳回', icon: 'none' })
    } else {
      status.value = 'under_review'
      saveStatusMeta('submitted')
      uni.showToast({ title: '提交成功', icon: 'success' })
    }
    // 加载媒体列表
    await loadApplymentMedia()
    // 切换到状态页
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
    } else if (typeof msg === 'string' && /identity_info|经营者|法定代表人|身份证件|身份证姓名/.test(msg)) {
      msg = '身份证件信息不完整，请确保已上传人像面、国徽面并填写正确姓名和身份证号'
    }
    uni.showToast({ title: typeof msg === 'string' ? msg : '提交失败', icon: 'none' })
  }
}

// 加载媒体列表
async function loadApplymentMedia() {
  try {
    if (!currentApplyment.value) return mediaList.value = []
    const list = await listMedia({ applyment_id: currentApplyment.value.id || currentApplyment.value.applyment_id })
    mediaList.value = list || []
  } catch (e) {
    console.warn('load media failed', e)
    mediaList.value = []
  }
}

// 刷新进件状态
async function refreshApplyment() {
  try {
    if (!currentApplyment.value) return
    const fresh = await getApplymentById(currentApplyment.value.id || currentApplyment.value.applyment_id)
    if (fresh) currentApplyment.value = fresh
    // 根据后端真实状态更新
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
  } catch (e) {
    console.warn('refresh failed', e)
  }
}

// 预览媒体项
function previewMediaItem(item) {
  try {
    const url = item && (item.url || item.file_url)
    if (url) uni.previewImage({ urls: [url], current: url })
  } catch (e) {
    console.warn(e)
  }
}

// 状态文本
const statusText = computed(() => {
  if (status.value === 'pending') return '待提交'
  if (status.value === 'checking') return '自动校验中'
  if (status.value === 'under_review') return '人工复核中'
  if (status.value === 'submitted' || status.value === 'approved') return '已通过'
  if (status.value === 'rejected') return '已驳回'
  if (status.value === 'auto_rejected') return '自动驳回'
  return ''
})

// 从状态页返回编辑
function editAfterSubmit() {
  step.value = 1
}

// 保存状态元数据
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
.cert-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 类型选择模态框 */
.type-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.type-modal {
  width: 640rpx;
  max-width: 90%;
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.15);
}

.type-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 40rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.type-modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.5rpx;
}

.type-modal-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f5f5;
}
.type-close-hover {
  background: #eee !important;
}
.type-close-icon {
  font-size: 40rpx;
  color: #8c8c8c;
  line-height: 1;
}

.type-modal-content {
  display: flex;
  padding: 32rpx 40rpx 40rpx;
  gap: 24rpx;
}

.type-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 36rpx 24rpx;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
}
.type-option-hover {
  transform: scale(0.98);
  opacity: 0.95;
}
.type-personal {
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4ff 100%);
  border-color: #d6e9ff;
}
.type-enterprise {
  background: linear-gradient(135deg, #fff8f0 0%, #fff0e6 100%);
  border-color: #ffe4d0;
}
.type-option-icon {
  font-size: 56rpx;
  line-height: 1;
  margin-bottom: 4rpx;
}
.type-option-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.type-option-desc {
  font-size: 22rpx;
  color: #8c8c8c;
  line-height: 1.3;
}

/* 表单页面 */
.cert-form {
  padding: 32rpx;
}

.form-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 32rpx;
}

.form-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.input-group {
  margin-bottom: 24rpx;
}

.input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #f8f8f8;
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  text-align: center;
}

.input::placeholder {
  color: #999;
}

.upload-group {
  margin-top: 32rpx;
}

.upload-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.upload-row {
  display: flex;
  gap: 20rpx;
  flex-wrap: wrap;
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.upload-box {
  width: 160rpx;
  height: 160rpx;
  background-color: #f8f8f8;
  border: 2rpx dashed #d0d0d0;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.upload-box.add {
  background-color: #fff;
}

.upload-box.single {
  width: 200rpx;
  height: 200rpx;
}

.upload-box .img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-box text {
  font-size: 48rpx;
  color: #999;
}

.upload-label-text {
  font-size: 24rpx;
  color: #666;
}

.remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  border-radius: 0 0 0 12rpx;
}

.bank-group {
  margin-top: 32rpx;
}

.agent-group {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #eee;
}

.section-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

/* 操作按钮 */
.action-buttons {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-save,
.btn-submit {
  width: 100%;
  height: 88rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 500;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-save {
  background-color: #f5f5f5;
  color: #666;
}

.btn-submit {
  background-color: #42bd56;
  color: #fff;
}

.btn-save.disabled,
.btn-submit.disabled {
  background-color: #e0e0e0;
  color: #999;
}

/* 状态页面 */
.status-box {
  padding: 32rpx;
  background-color: #fff;
  border-radius: 16rpx;
  margin: 32rpx;
}

.status-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.status-time,
.status-reason,
.status-suggest {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-top: 12rpx;
  line-height: 1.6;
}

.status-reason {
  color: #ff6b6b;
}

.applyment-detail {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #eee;
}

.detail-row {
  display: flex;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: #666;
}

.detail-row .label {
  width: 160rpx;
  color: #999;
}

.media-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #eee;
}

.media-title {
  display: block;
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 20rpx;
}

.media-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.media-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
}

.media-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.media-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.media-name {
  font-size: 28rpx;
  color: #333;
}

.media-type {
  font-size: 24rpx;
  color: #999;
}

.media-empty {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.media-actions {
  margin-top: 20rpx;
}

.btn-small,
.btn-refresh,
.btn-edit {
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  border-radius: 8rpx;
  border: none;
}

.btn-small {
  background-color: #42bd56;
  color: #fff;
}

.btn-refresh {
  background-color: #2d8cf0;
  color: #fff;
}

.btn-edit {
  background-color: #f5f5f5;
  color: #666;
}

.status-actions {
  margin-top: 32rpx;
  display: flex;
  gap: 20rpx;
}

.status-actions button {
  flex: 1;
}
</style>