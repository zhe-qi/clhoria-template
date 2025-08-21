/** 微信各平台 openid 接口 */
export interface WxOpenId {
  app?: string;
  mp?: string;
  h5?: string;
  web?: string;
}

/** QQ各平台 openid 接口 */
export interface QqOpenId {
  app?: string;
  mp?: string;
}

/** 第三方平台信息接口 */
export interface ThirdPartyInfo {
  mpWeixin?: {
    sessionKey?: string;
  };
  appWeixin?: {
    accessToken?: string;
    accessTokenExpired?: string;
    refreshToken?: string;
  };
  h5Weixin?: {
    accessToken?: string;
    accessTokenExpired?: string;
    refreshToken?: string;
  };
  webWeixin?: {
    accessToken?: string;
    accessTokenExpired?: string;
    refreshToken?: string;
  };
  mpQq?: {
    sessionKey?: string;
  };
  appQq?: {
    accessToken?: string;
    accessTokenExpired?: string;
  };
}

/** 注册环境信息接口 */
export interface RegisterEnv {
  appid?: string;
  uniPlatform?: string;
  osName?: string;
  appName?: string;
  appVersion?: string;
  appVersionCode?: string;
  channel?: string;
  clientIp?: string;
}

/** 实名认证信息接口 */
export interface RealNameAuth {
  type: number;
  authStatus: number;
  authDate?: string;
  realName?: string;
  identity?: string;
  idCardFront?: string;
  idCardBack?: string;
  inHand?: string;
  license?: string;
  contactPerson?: string;
  contactMobile?: string;
  contactEmail?: string;
}

/** 第三方平台身份信息接口 */
export interface Identity {
  provider?: string;
  userInfo?: Record<string, any>;
  openid?: string;
  unionid?: string;
  uid?: string;
}
