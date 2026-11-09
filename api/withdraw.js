// No owner-scoped withdrawal ledger/provider contract is configured.
export const WITHDRAW_UNAVAILABLE = '提现暂不可用：需接入本人账户余额、资金预留及银行打款服务'
const unavailable = async () => { throw Object.assign(new Error(WITHDRAW_UNAVAILABLE), { code: 'WITHDRAW_UNAVAILABLE' }) }
export const verifyPayPassword = unavailable
export const createWithdrawRequest = unavailable
export const getWithdrawById = unavailable
export const listWithdrawals = unavailable
export const retryWithdraw = unavailable
export default { verifyPayPassword, createWithdrawRequest, getWithdrawById, listWithdrawals, retryWithdraw }
