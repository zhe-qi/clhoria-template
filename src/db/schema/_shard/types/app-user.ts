/** 微信各平台 openid 接口 */
export type WxOpenId = {
  /** app平台微信openid */
  app?: string;
  /** 微信小程序平台openid */
  mp?: string;
  /** 微信网页应用openid */
  web?: string;
  /** 微信公众号应用openid */
  h5?: string;
};

/** QQ各平台 openid 接口 */
export type QqOpenId = {
  /** app平台QQ openid */
  app?: string;
  /** QQ小程序平台openid */
  mp?: string;
};

/** 第三方平台信息接口 */
export type ThirdPartyInfo = {
  /** 微信小程序相关信息 */
  mpWeixin?: {
    /** 微信小程序session key */
    sessionKey?: string;
  };
  /** app平台微信相关信息 */
  appWeixin?: {
    /** app平台微信access token */
    accessToken?: string;
    /** app平台微信access token过期时间 */
    accessTokenExpired?: string;
    /** app平台微信refresh token */
    refreshToken?: string;
  };
  /** 微信公众号平台微信相关信息 */
  h5Weixin?: {
    /** 微信公众号平台access token */
    accessToken?: string;
    /** 微信公众号平台access token过期时间 */
    accessTokenExpired?: string;
    /** 微信公众号平台refresh token */
    refreshToken?: string;
  };
  /** web平台微信相关信息 */
  webWeixin?: {
    /** web平台微信access token */
    accessToken?: string;
    /** web平台微信access token过期时间 */
    accessTokenExpired?: string;
    /** web平台微信refresh token */
    refreshToken?: string;
  };
  /** QQ小程序相关信息 */
  mpQq?: {
    /** QQ小程序session key */
    sessionKey?: string;
  };
  /** app平台QQ相关信息 */
  appQq?: {
    /** app平台QQ access token */
    accessToken?: string;
    /** app平台QQ access token过期时间 */
    accessTokenExpired?: string;
  };
};

/**
 * 注册环境信息接口
 * 注意：该字段仅记录前端用户注册时的前端环境信息，管理员通过云端添加用户则无此字段
 */
export type RegisterEnv = {
  /** 注册时的客户端appId */
  appid?: string;
  /** 注册时的客户端平台，如 h5、app、mp-weixin 等 */
  uniPlatform?: string;
  /** 注册时的客户端系统名，如 ios、android、windows、mac、linux */
  osName?: string;
  /** 注册时的客户端名称 */
  appName?: string;
  /** 注册时的客户端版本 */
  appVersion?: string;
  /** 注册时的客户端版本号 */
  appVersionCode?: string;
  /** 注册时的客户端启动场景（小程序）或应用渠道（app） */
  channel?: string;
  /** 注册时的客户端IP */
  clientIp?: string;
};

/** 实名认证信息接口 */
export type RealNameAuth = {
  /** 用户类型：0 个人用户 1 企业用户 */
  type: number;
  /** 认证状态：0 未认证 1 等待认证 2 认证通过 3 认证失败 */
  authStatus: number;
  /** 认证通过时间（ISO字符串） */
  authDate?: string;
  /** 真实姓名/企业名称 */
  realName?: string;
  /** 身份证号码/营业执照号码 */
  identity?: string;
  /** 身份证正面照 URL */
  idCardFront?: string;
  /** 身份证反面照 URL */
  idCardBack?: string;
  /** 手持身份证照片 URL */
  idCardInHand?: string;
  /** 营业执照 URL */
  license?: string;
  /** 联系人姓名 */
  contactPerson?: string;
  /** 联系人手机号码 */
  contactMobile?: string;
  /** 联系人邮箱 */
  contactEmail?: string;
};

/** 第三方平台身份信息接口 */
export type Identity = {
  /** 身份源 */
  provider?: string;
  /** 三方用户信息 */
  userInfo?: Record<string, any>;
  /** 三方openid */
  openid?: string;
  /** 三方unionid */
  unionid?: string;
  /** 三方uid */
  uid?: string;
};
