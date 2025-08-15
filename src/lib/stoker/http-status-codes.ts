// 自动生成的文件，请勿编辑
// 状态码获取于 Thu, 03 Oct 2024 12:05:14 GMT，来源：https://raw.githubusercontent.com/prettymuchbryce/http-status-codes/refs/heads/master/codes.json
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.3
 *
 * 请求已接收但尚未处理。这是非承诺性的，意味着在 HTTP 中无法稍后发送异步响应来指示请求的处理结果。适用于由其他进程或服务器处理请求，或批处理的情况。
 */
export const ACCEPTED = 202;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.3
 *
 * 此错误响应表示服务器在作为网关获取处理请求所需的响应时，收到了无效响应。
 */
export const BAD_GATEWAY = 502;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.1
 *
 * 此响应表示服务器由于无效语法而无法理解请求。
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
 * 此临时响应表示到目前为止一切正常，客户端应继续请求或如果已完成则忽略它。
 */
export const CONTINUE = 100;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.2
 *
 * 请求已成功，并因此创建了新资源。这通常是 PUT 请求后发送的响应。
 */
export const CREATED = 201;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.14
 *
 * 此响应码表示服务器无法满足 Expect 请求头字段所指示的期望。
 */
export const EXPECTATION_FAILED = 417;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.5
 *
 * 请求因先前请求的失败而失败。
 */
export const FAILED_DEPENDENCY = 424;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.3
 *
 * 客户端没有访问内容的权限，即它们未被授权，因此服务器拒绝给出正确响应。与 401 不同，服务器知道客户端的身份。
 */
export const FORBIDDEN = 403;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.5
 *
 * 当服务器作为网关无法在规定时间内获得响应时，给出此错误响应。
 */
export const GATEWAY_TIMEOUT = 504;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.9
 *
 * 当请求的内容已从服务器永久删除，且没有转发地址时，会发送此响应。客户端应移除其缓存和指向资源的链接。HTTP 规范旨在将此状态码用于“限时促销服务”。API 不应觉得有义务使用此状态码来表示已删除的资源。
 */
export const GONE = 410;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.6
 *
 * 请求中使用的 HTTP 版本不被服务器支持。
 */
export const HTTP_VERSION_NOT_SUPPORTED = 505;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2324#section-2.3.2
 *
 * 任何用茶壶煲咖啡的尝试都应该导致错误代码“418 我是一个茶壶”。结果实体主体可能又短又肥。
 */
export const IM_A_TEAPOT = 418;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 507（存储空间不足）状态码表示由于服务器无法存储成功完成请求所需的表示，因此无法对资源执行方法。此情况被视为临时的。如果收到此状态码的请求是用户操作的结果，则在单独的用户操作请求之前，不得重复请求。
 */
export const INSUFFICIENT_SPACE_ON_RESOURCE = 419;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 服务器内部配置错误：选定的变体资源被配置为自身参与透明内容协商，因此不是协商过程中的适当终点。
 */
export const INSUFFICIENT_STORAGE = 507;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.1
 *
 * 服务器遇到了防止它完成请求的意外情况。
 */
export const INTERNAL_SERVER_ERROR = 500;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.10
 *
 * 服务器拒绝了请求，因为没有定义 Content-Length 头字段，而服务器要求它。
 */
export const LENGTH_REQUIRED = 411;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.4
 *
 * 正在访问的资源被锁定。
 */
export const LOCKED = 423;
/**
 * @deprecated
 * 官方文档 @ https://tools.ietf.org/rfcdiff?difftype=--hwdiff&url2=draft-ietf-webdav-protocol-06.txt
 *
 * Spring Framework 在方法失败时使用的已废弃响应。
 */
export const METHOD_FAILURE = 420;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.5
 *
 * 请求方法被服务器知道但已被禁用，无法使用。例如，API 可能禁止删除资源。两个必需的方法 GET 和 HEAD 绝不能被禁用，且不应返回此错误代码。
 */
export const METHOD_NOT_ALLOWED = 405;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.2
 *
 * 此响应码表示请求资源的 URI 已更改。可能会在响应中给出新的 URI。
 */
export const MOVED_PERMANENTLY = 301;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.3
 *
 * 此响应码表示请求资源的 URI 已临时更改。将来可能会对 URI 进行新的更改。因此，客户端在将来的请求中应使用相同的 URI。
 */
export const MOVED_TEMPORARILY = 302;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.2
 *
 * 多状态响应在可能适用多个状态码的情况下传达有关多个资源的信息。
 */
export const MULTI_STATUS = 207;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.1
 *
 * 请求有多个可能的响应。用户代理或用户应选择其中之一。没有标准化的方式来选择其中一个响应。
 */
export const MULTIPLE_CHOICES = 300;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-6
 *
 * 511 状态码表示客户端需要身份验证以获得网络访问权。
 */
export const NETWORK_AUTHENTICATION_REQUIRED = 511;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.5
 *
 * 此请求没有内容可发送，但头信息可能有用。用户代理可以用新的头信息更新其针对此资源的缓存头信息。
 */
export const NO_CONTENT = 204;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.4
 *
 * 此响应码表示返回的元信息集不是来自原始服务器的精确集合，而是从本地或第三方副本收集的。除此情况外，应首选 200 OK 响应。
 */
export const NON_AUTHORITATIVE_INFORMATION = 203;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.6
 *
 * 当 Web 服务器在执行服务器驱动的内容协商后，找不到符合用户代理给出标准的任何内容时，发送此响应。
 */
export const NOT_ACCEPTABLE = 406;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.4
 *
 * 服务器找不到请求的资源。在浏览器中，这意味着 URL 无法识别。在 API 中，这也可能意味着端点有效但资源本身不存在。服务器也可能发送此响应而不是 403，以对未授权客户端隐藏资源的存在。这个响应码可能是最著名的，因为它在网络上经常出现。
 */
export const NOT_FOUND = 404;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.2
 *
 * 请求方法不被服务器支持，无法处理。服务器必须支持的唯一方法（因此不得返回此代码）是 GET 和 HEAD。
 */
export const NOT_IMPLEMENTED = 501;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.1
 *
 * 这用于缓存目的。它告诉客户端响应未被修改。因此，客户端可以继续使用相同的缓存版本响应。
 */
export const NOT_MODIFIED = 304;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.1
 *
 * 请求已成功。成功的含义根据 HTTP 方法而异：
 * GET：资源已获取并在消息主体中传输。
 * HEAD：实体头在消息主体中。
 * POST：描述操作结果的资源在消息主体中传输。
 * TRACE：消息主体包含服务器收到的请求消息
 */
export const OK = 200;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.1
 *
 * 由于客户端发送的范围头，此响应码用于将下载分离成多个流。
 */
export const PARTIAL_CONTENT = 206;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.2
 *
 * 此响应码保留供将来使用。创建此代码的初衷目的是将其用于数字支付系统，但目前未使用。
 */
export const PAYMENT_REQUIRED = 402;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7538#section-3
 *
 * 这意味着资源现在永久地位于另一个 URI，由 Location: HTTP 响应头指定。这与 301 Moved Permanently HTTP 响应码具有相同的语义，但用户代理不得更改使用的 HTTP 方法：如果在第一个请求中使用了 POST，则在第二个请求中必须使用 POST。
 */
export const PERMANENT_REDIRECT = 308;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.2
 *
 * 客户端在其头中指示了服务器不满足的先决条件。
 */
export const PRECONDITION_FAILED = 412;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-3
 *
 * 源服务器要求请求是有条件的。旨在防止“丢失更新”问题，即客户端 GET 资源状态、修改它并将其 PUT 回服务器，而此时第三方已修改了服务器上的状态，导致冲突。
 */
export const PRECONDITION_REQUIRED = 428;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.1
 *
 * 此代码表示服务器已收到并正在处理请求，但尚无可用响应。
 */
export const PROCESSING = 102;
/**
 * 官方文档 @ https://www.rfc-editor.org/rfc/rfc8297#page-3
 *
 * 此代码向客户端指示服务器可能会发送包含信息响应中包含的头字段的最终响应。
 */
export const EARLY_HINTS = 103;
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.15
 *
 * 服务器拒绝使用当前协议执行请求，但在客户端升级到不同协议后可能会愿意这样做。
 */
export const UPGRADE_REQUIRED = 426;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.2
 *
 * 这与 401 类似，但需要通过代理进行身份验证。
 */
export const PROXY_AUTHENTICATION_REQUIRED = 407;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-5
 *
 * 服务器不愿意处理请求，因为其头字段过大。可以在减小请求头字段的大小后重新提交请求。
 */
export const REQUEST_HEADER_FIELDS_TOO_LARGE = 431;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.7
 *
 * 一些服务器在空闲连接上发送此响应，甚至没有客户端的任何先前请求。这意味着服务器希望关闭这个未使用的连接。自从一些浏览器（如 Chrome、Firefox 27+或 IE9）使用 HTTP 预连接机制来加速浏览以来，此响应使用更加频繁。还要注意，一些服务器只是关闭连接而不发送此消息。
 */
export const REQUEST_TIMEOUT = 408;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.11
 *
 * 请求实体大于服务器定义的限制；服务器可能关闭连接或返回 Retry-After 头字段。
 */
export const REQUEST_TOO_LONG = 413;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.12
 *
 * 客户端请求的 URI 比服务器愿意解释的更长。
 */
export const REQUEST_URI_TOO_LONG = 414;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.4
 *
 * 请求中 Range 头字段指定的范围无法满足；范围可能超出了目标 URI 数据的大小。
 */
export const REQUESTED_RANGE_NOT_SATISFIABLE = 416;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.6
 *
 * 在完成请求后发送此响应码，告诉用户代理重置发送此请求的文档视图。
 */
export const RESET_CONTENT = 205;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.4
 *
 * 服务器发送此响应指示客户端将请求的资源用 GET 请求获取到另一个 URI。
 */
export const SEE_OTHER = 303;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.4
 *
 * 服务器尚未准备好处理请求。常见原因是服务器正在维护或过载。请注意，与此响应一起，应发送解释问题的用户友好页面。此响应应用于临时情况，如果可能，Retry-After: HTTP 头应包含服务恢复前的估计时间。网站管理员还必须关注与此响应一起发送的缓存相关头，因为这些临时情况响应通常不应被缓存。
 */
export const SERVICE_UNAVAILABLE = 503;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.2.2
 *
 * 此代码是为了响应客户端的 Upgrade 请求头而发送的，表示服务器正在切换到的协议。
 */
export const SWITCHING_PROTOCOLS = 101;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.7
 *
 * 服务器发送此响应指示客户端用与先前请求相同的方法将请求的资源获取到另一个 URI。这与 302 Found HTTP 响应码具有相同的语义，但用户代理不得更改使用的 HTTP 方法：如果在第一个请求中使用了 POST，则在第二个请求中必须使用 POST。
 */
export const TEMPORARY_REDIRECT = 307;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-4
 *
 * 用户在给定时间内发送了太多请求（“速率限制”）。
 */
export const TOO_MANY_REQUESTS = 429;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.1
 *
 * 尽管 HTTP 标准指定为“未授权”，从语义上讲，此响应意味着“未身份验证”。也就是说，客户端必须身份验证才能获得请求的响应。
 */
export const UNAUTHORIZED = 401;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7725
 *
 * 用户代理请求了一个无法合法提供的资源，例如被政府审查的网页。
 */
export const UNAVAILABLE_FOR_LEGAL_REASONS = 451;
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.3
 *
 * 请求格式正确，但由于语义错误而无法遵循。
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
 * 在 HTTP 规范的先前版本中定义，用于指示必须通过代理访问请求的响应。由于代理带内配置的安全问题，它已被废弃。
 */
export const USE_PROXY = 305;
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2
 *
 * 在 HTTP/2 规范中定义，指示服务器无法为请求 URI 中包含的方案和权限组合生成响应。
 */
export const MISDIRECTED_REQUEST = 421;
