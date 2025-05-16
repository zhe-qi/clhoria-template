// 生成的文件。请勿编辑
// 代码于 2024年10月3日星期四 12:05:14 GMT 从 https://raw.githubusercontent.com/prettymuchbryce/http-status-codes/refs/heads/master/codes.json 获取
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.3
 *
 * 请求已被接收但尚未处理。这是一种非承诺性的状态，意味着在HTTP中没有办法在以后发送异步响应来指示请求处理的结果。它适用于另一个进程或服务器处理请求的情况，或用于批处理。
 */
export const ACCEPTED = 202;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.3
 *
 * 此错误响应表示服务器作为网关工作以获取处理请求所需的响应时，收到了无效响应。
 */
export const BAD_GATEWAY = 502;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.1
 *
 * 此响应表示服务器由于语法无效而无法理解请求。
 */
export const BAD_REQUEST = 400;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.8
 *
 * 当请求与服务器当前状态冲突时发送此响应。
 */
export const CONFLICT = 409;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.2.1
 *
 * 此临时响应表示到目前为止一切正常，客户端应继续请求，或者如果请求已完成则忽略它。
 */
export const CONTINUE = 100;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.2
 *
 * 请求已成功，并因此创建了一个新资源。这通常是在PUT请求之后发送的响应。
 */
export const CREATED = 201;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.14
 *
 * 此响应代码表示服务器无法满足Expect请求头字段指示的期望。
 */
export const EXPECTATION_FAILED = 417;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.5
 *
 * 请求由于之前请求的失败而失败。
 */
export const FAILED_DEPENDENCY = 424;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.3
 *
 * 客户端没有内容的访问权限，即它们未经授权，因此服务器拒绝给出适当的响应。与401不同，服务器知道客户端的身份。
 */
export const FORBIDDEN = 403;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.5
 *
 * 当服务器作为网关运行并且无法及时获得响应时，会给出此错误响应。
 */
export const GATEWAY_TIMEOUT = 504;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.9
 *
 * 当请求的内容已从服务器上永久删除且没有转发地址时，会发送此响应。客户端应该删除其缓存和对资源的链接。HTTP规范希望此状态码用于"限时促销服务"。API不应该感到必须使用此状态码来指示已删除的资源。
 */
export const GONE = 410;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.6
 *
 * 服务器不支持请求中使用的HTTP版本。
 */
export const HTTP_VERSION_NOT_SUPPORTED = 505;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2324#section-2.3.2
 *
 * 任何试图用茶壶煮咖啡的行为都应导致错误代码"418 我是一个茶壶"。生成的实体主体可能又矮又胖。
 */
export const IM_A_TEAPOT = 418;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 507（存储空间不足）状态码表示由于服务器无法存储成功完成请求所需的表示，因此无法对资源执行该方法。这种情况被认为是暂时的。如果收到此状态码的请求是用户操作的结果，则不得重复该请求，除非由单独的用户操作请求。
 */
export const INSUFFICIENT_SPACE_ON_RESOURCE = 419;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 服务器有内部配置错误：所选的变体资源被配置为自身参与透明内容协商，因此不是协商过程中的适当端点。
 */
export const INSUFFICIENT_STORAGE = 507;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.1
 *
 * 服务器遇到了阻止其完成请求的意外情况。
 */
export const INTERNAL_SERVER_ERROR = 500;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.10
 *
 * 服务器拒绝该请求，因为Content-Length头字段未定义，而服务器需要它。
 */
export const LENGTH_REQUIRED = 411;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.4
 *
 * 正在访问的资源已被锁定。
 */
export const LOCKED = 423;
/**
 * @deprecated
 * 官方文档 @ https://tools.ietf.org/rfcdiff?difftype=--hwdiff&url2=draft-ietf-webdav-protocol-06.txt
 *
 * Spring Framework在方法失败时使用的已弃用响应。
 */
export const METHOD_FAILURE = 420;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.5
 *
 * 服务器知道请求方法，但已被禁用且无法使用。例如，API可能禁止DELETE资源。两个必须的方法，GET和HEAD，不得被禁用，也不应返回此错误代码。
 */
export const METHOD_NOT_ALLOWED = 405;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.2
 *
 * 此响应代码表示请求资源的URI已更改。可能在响应中给出新的URI。
 */
export const MOVED_PERMANENTLY = 301;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.3
 *
 * 此响应代码表示请求资源的URI已暂时更改。未来可能会对URI进行新的更改。因此，客户端应在未来的请求中使用相同的URI。
 */
export const MOVED_TEMPORARILY = 302;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.2
 *
 * 多状态响应在可能适用多个状态代码的情况下传达有关多个资源的信息。
 */
export const MULTI_STATUS = 207;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.1
 *
 * 请求有多个可能的响应。用户代理或用户应该选择其中之一。没有标准化的方法来选择其中一个响应。
 */
export const MULTIPLE_CHOICES = 300;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-6
 *
 * 511状态码表示客户端需要进行身份验证才能获得网络访问权限。
 */
export const NETWORK_AUTHENTICATION_REQUIRED = 511;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.5
 *
 * 没有内容可以为此请求发送，但标头可能有用。用户代理可以使用新的信息更新其缓存的资源标头。
 */
export const NO_CONTENT = 204;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.4
 *
 * 此响应代码表示返回的元信息集不是来自原始服务器的精确集合，而是从本地或第三方副本收集的。除此条件外，应优先使用200 OK响应而非此响应。
 */
export const NON_AUTHORITATIVE_INFORMATION = 203;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.6
 *
 * 当Web服务器在执行服务器驱动的内容协商后，找不到符合用户代理给定标准的任何内容时，会发送此响应。
 */
export const NOT_ACCEPTABLE = 406;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.4
 *
 * 服务器找不到请求的资源。在浏览器中，这意味着无法识别URL。在API中，这也可能意味着端点有效但资源本身不存在。服务器也可能发送此响应而不是403，以对未经授权的客户端隐藏资源的存在。由于在网络上经常出现，这个响应代码可能是最著名的一个。
 */
export const NOT_FOUND = 404;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.2
 *
 * 服务器不支持请求方法，无法处理。服务器必须支持的唯一方法（因此不得返回此代码）是GET和HEAD。
 */
export const NOT_IMPLEMENTED = 501;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.1
 *
 * 这用于缓存目的。它告诉客户端响应尚未被修改。因此，客户端可以继续使用相同的缓存版本的响应。
 */
export const NOT_MODIFIED = 304;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.1
 *
 * 请求已成功。成功的含义取决于HTTP方法：
 * GET：资源已被获取并在消息正文中传输。
 * HEAD：实体头在消息正文中。
 * POST：描述操作结果的资源在消息正文中传输。
 * TRACE：消息正文包含服务器接收到的请求消息
 */
export const OK = 200;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.1
 *
 * 由于客户端发送的范围头字段，此响应代码用于将下载分成多个流。
 */
export const PARTIAL_CONTENT = 206;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.2
 *
 * 此响应代码保留供将来使用。创建此代码的最初目的是将其用于数字支付系统，但目前未使用。
 */
export const PAYMENT_REQUIRED = 402;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7538#section-3
 *
 * 这意味着资源现在位于由Location: HTTP响应头指定的另一个URI处。这与301 Moved Permanently HTTP响应代码具有相同的语义，但有一个例外，即用户代理不得更改所使用的HTTP方法：如果在第一个请求中使用了POST，则必须在第二个请求中使用POST。
 */
export const PERMANENT_REDIRECT = 308;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.2
 *
 * 客户端在其头部中指示了服务器不满足的前提条件。
 */
export const PRECONDITION_FAILED = 412;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-3
 *
 * 源服务器要求请求是有条件的。旨在防止"丢失更新"问题，即客户端GET资源的状态，修改它，然后PUT回服务器，而同时第三方修改了服务器上的状态，导致冲突。
 */
export const PRECONDITION_REQUIRED = 428;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.1
 *
 * 此代码表示服务器已收到并正在处理请求，但尚无响应可用。
 */
export const PROCESSING = 102;
/**
 * 官方文档 @ https://www.rfc-editor.org/rfc/rfc8297#page-3
 *
 * 此代码向客户端表明服务器可能会发送包含信息响应中包含的头字段的最终响应。
 */
export const EARLY_HINTS = 103;
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.15
 *
 * 服务器拒绝使用当前协议执行请求，但可能在客户端升级到不同协议后愿意这样做。
 */
export const UPGRADE_REQUIRED = 426;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.2
 *
 * 这类似于401，但需要通过代理进行身份验证。
 */
export const PROXY_AUTHENTICATION_REQUIRED = 407;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-5
 *
 * 服务器不愿处理请求，因为其头字段太大。在减小请求头字段的大小后，可以重新提交请求。
 */
export const REQUEST_HEADER_FIELDS_TOO_LARGE = 431;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.7
 *
 * 此响应由某些服务器在空闲连接上发送，即使没有客户端的任何先前请求。这表示服务器希望关闭此未使用的连接。自从一些浏览器，如Chrome、Firefox 27+或IE9，使用HTTP预连接机制加速浏览以来，此响应使用得更多。还要注意，一些服务器仅关闭连接而不发送此消息。
 */
export const REQUEST_TIMEOUT = 408;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.11
 *
 * 请求实体大于服务器定义的限制；服务器可能关闭连接或返回Retry-After头字段。
 */
export const REQUEST_TOO_LONG = 413;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.12
 *
 * 客户端请求的URI比服务器愿意解释的更长。
 */
export const REQUEST_URI_TOO_LONG = 414;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.4
 *
 * 请求中的Range头字段指定的范围无法满足；可能该范围在目标URI数据的大小之外。
 */
export const REQUESTED_RANGE_NOT_SATISFIABLE = 416;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.6
 *
 * 这个响应代码是在完成请求后发送的，告诉用户代理重置发送此请求的文档视图。
 */
export const RESET_CONTENT = 205;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.4
 *
 * 服务器发送此响应，指示客户端使用GET请求获取另一个URI的请求资源。
 */
export const SEE_OTHER = 303;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.4
 *
 * 服务器没有准备好处理请求。常见原因是服务器因维护而停机或过载。请注意，与此响应一起，应发送一个解释问题的用户友好页面。这些响应应用于临时条件，如果可能，Retry-After: HTTP头应包含恢复服务的估计时间。网站管理员还必须注意与此响应一起发送的与缓存相关的头，因为这些临时条件响应通常不应被缓存。
 */
export const SERVICE_UNAVAILABLE = 503;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.2.2
 *
 * 此代码是响应客户端的Upgrade请求头发送的，表示服务器正在切换的协议。
 */
export const SWITCHING_PROTOCOLS = 101;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.7
 *
 * 服务器发送此响应，指示客户端使用与先前请求相同的方法获取另一个URI的请求资源。这与302 Found HTTP响应代码具有相同的语义，但有一个例外，即用户代理不得更改所使用的HTTP方法：如果在第一个请求中使用了POST，则必须在第二个请求中使用POST。
 */
export const TEMPORARY_REDIRECT = 307;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-4
 *
 * 用户在给定时间内发送了太多请求（"速率限制"）。
 */
export const TOO_MANY_REQUESTS = 429;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.1
 *
 * 尽管HTTP标准指定为"未授权"，但从语义上讲，此响应意味着"未认证"。也就是说，客户端必须对自己进行身份验证才能获得请求的响应。
 */
export const UNAUTHORIZED = 401;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7725
 *
 * 用户代理请求了无法合法提供的资源，例如政府审查的网页。
 */
export const UNAVAILABLE_FOR_LEGAL_REASONS = 451;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.3
 *
 * 请求格式良好，但由于语义错误而无法遵循。
 */
export const UNPROCESSABLE_ENTITY = 422;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.13
 *
 * 服务器不支持请求数据的媒体格式，因此服务器拒绝请求。
 */
export const UNSUPPORTED_MEDIA_TYPE = 415;
/**
 * @deprecated
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.6
 *
 * 在HTTP规范的先前版本中定义，表示必须通过代理访问请求的响应。由于关于代理带内配置的安全问题，它已被弃用。
 */
export const USE_PROXY = 305;
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2
 *
 * 在HTTP/2规范中定义，表示服务器无法为请求URI中包含的方案和权限组合生成响应。
 */
export const MISDIRECTED_REQUEST = 421;
