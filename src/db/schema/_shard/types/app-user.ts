/** WeChat openid interface for each platform / 微信各平台 openid 接口 */
export type WxOpenId = {
  /** WeChat openid for app platform / app平台微信openid */
  app?: string;
  /** WeChat Mini Program openid / 微信小程序平台openid */
  mp?: string;
  /** WeChat web application openid / 微信网页应用openid */
  web?: string;
  /** WeChat Official Account openid / 微信公众号应用openid */
  h5?: string;
};

/** QQ openid interface for each platform / QQ各平台 openid 接口 */
export type QqOpenId = {
  /** QQ openid for app platform / app平台QQ openid */
  app?: string;
  /** QQ Mini Program openid / QQ小程序平台openid */
  mp?: string;
};

/** Third-party platform info interface / 第三方平台信息接口 */
export type ThirdPartyInfo = {
  /** WeChat Mini Program info / 微信小程序相关信息 */
  mpWeixin?: {
    /** WeChat Mini Program session key / 微信小程序session key */
    sessionKey?: string;
  };
  /** WeChat info for app platform / app平台微信相关信息 */
  appWeixin?: {
    /** WeChat access token for app platform / app平台微信access token */
    accessToken?: string;
    /** WeChat access token expiration for app platform / app平台微信access token过期时间 */
    accessTokenExpired?: string;
    /** WeChat refresh token for app platform / app平台微信refresh token */
    refreshToken?: string;
  };
  /** WeChat info for Official Account platform / 微信公众号平台微信相关信息 */
  h5Weixin?: {
    /** WeChat Official Account access token / 微信公众号平台access token */
    accessToken?: string;
    /** WeChat Official Account access token expiration / 微信公众号平台access token过期时间 */
    accessTokenExpired?: string;
    /** WeChat Official Account refresh token / 微信公众号平台refresh token */
    refreshToken?: string;
  };
  /** WeChat info for web platform / web平台微信相关信息 */
  webWeixin?: {
    /** WeChat access token for web platform / web平台微信access token */
    accessToken?: string;
    /** WeChat access token expiration for web platform / web平台微信access token过期时间 */
    accessTokenExpired?: string;
    /** WeChat refresh token for web platform / web平台微信refresh token */
    refreshToken?: string;
  };
  /** QQ Mini Program info / QQ小程序相关信息 */
  mpQq?: {
    /** QQ Mini Program session key / QQ小程序session key */
    sessionKey?: string;
  };
  /** QQ info for app platform / app平台QQ相关信息 */
  appQq?: {
    /** QQ access token for app platform / app平台QQ access token */
    accessToken?: string;
    /** QQ access token expiration for app platform / app平台QQ access token过期时间 */
    accessTokenExpired?: string;
  };
};

/**
 * Registration environment info interface
 * Note: This field only records the frontend environment info at the time of user registration; users added by admin via cloud do not have this field
 * 注册环境信息接口
 * 注意：该字段仅记录前端用户注册时的前端环境信息，管理员通过云端添加用户则无此字段
 */
export type RegisterEnv = {
  /** Client appId at registration / 注册时的客户端appId */
  appid?: string;
  /** Client platform at registration, e.g., h5, app, mp-weixin / 注册时的客户端平台，如 h5、app、mp-weixin 等 */
  uniPlatform?: string;
  /** Client OS name at registration, e.g., ios, android, windows, mac, linux / 注册时的客户端系统名，如 ios、android、windows、mac、linux */
  osName?: string;
  /** Client name at registration / 注册时的客户端名称 */
  appName?: string;
  /** Client version at registration / 注册时的客户端版本 */
  appVersion?: string;
  /** Client version code at registration / 注册时的客户端版本号 */
  appVersionCode?: string;
  /** Client launch scene (Mini Program) or app channel at registration / 注册时的客户端启动场景（小程序）或应用渠道（app） */
  channel?: string;
  /** Client IP at registration / 注册时的客户端IP */
  clientIp?: string;
};

/** Real-name authentication info interface / 实名认证信息接口 */
export type RealNameAuth = {
  /** User type: 0 individual, 1 enterprise / 用户类型：0 个人用户 1 企业用户 */
  type: number;
  /** Auth status: 0 unverified, 1 pending, 2 approved, 3 rejected / 认证状态：0 未认证 1 等待认证 2 认证通过 3 认证失败 */
  authStatus: number;
  /** Auth approval time (ISO string) / 认证通过时间（ISO字符串） */
  authDate?: string;
  /** Real name / enterprise name / 真实姓名/企业名称 */
  realName?: string;
  /** ID number / business license number / 身份证号码/营业执照号码 */
  identity?: string;
  /** ID card front photo URL / 身份证正面照 URL */
  idCardFront?: string;
  /** ID card back photo URL / 身份证反面照 URL */
  idCardBack?: string;
  /** Hand-held ID card photo URL / 手持身份证照片 URL */
  idCardInHand?: string;
  /** Business license URL / 营业执照 URL */
  license?: string;
  /** Contact person name / 联系人姓名 */
  contactPerson?: string;
  /** Contact person mobile number / 联系人手机号码 */
  contactMobile?: string;
  /** Contact person email / 联系人邮箱 */
  contactEmail?: string;
};

/** Third-party platform identity info interface / 第三方平台身份信息接口 */
export type Identity = {
  /** Identity provider / 身份源 */
  provider?: string;
  /** Third-party user info / 三方用户信息 */
  userInfo?: Record<string, any>;
  /** Third-party openid / 三方openid */
  openid?: string;
  /** Third-party unionid / 三方unionid */
  unionid?: string;
  /** Third-party uid / 三方uid */
  uid?: string;
};
