// 生成的文件。请勿编辑
// 短语获取于 Thu, 03 Oct 2024 12:05:14 GMT，来源：https://raw.githubusercontent.com/prettymuchbryce/http-status-codes/refs/heads/master/codes.json
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.3
 *
 * 请求已被接收但尚未处理。它是非承诺性的，意味着在HTTP中没有方法稍后发送异步响应来指示请求处理的结果。它适用于其他进程或服务器处理请求的情况，或用于批处理。
 */
export const ACCEPTED = "Accepted";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.3
 *
 * 此错误响应表示服务器在作为网关获取处理请求所需的响应时收到了无效响应。
 */
export const BAD_GATEWAY = "Bad Gateway";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.1
 *
 * 此响应表示服务器由于语法无效而无法理解请求。
 */
export const BAD_REQUEST = "Bad Request";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.8
 *
 * 当请求与服务器的当前状态冲突时发送此响应。
 */
export const CONFLICT = "Conflict";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.2.1
 *
 * 此临时响应表示到目前为止一切正常，客户端应该继续请求，如果已经完成则可以忽略。
 */
export const CONTINUE = "Continue";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.2
 *
 * 请求已成功，并因此创建了新资源。这通常是在PUT请求之后发送的响应。
 */
export const CREATED = "Created";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.14
 *
 * 此响应代码表示服务器无法满足Expect请求头字段指示的期望。
 */
export const EXPECTATION_FAILED = "Expectation Failed";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.5
 *
 * 由于前一个请求失败，导致此请求失败。
 */
export const FAILED_DEPENDENCY = "Failed Dependency";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.3
 *
 * 客户端没有访问内容的权限，即未授权，因此服务器拒绝提供适当的响应。与401不同，服务器知道客户端的身份。
 */
export const FORBIDDEN = "Forbidden";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.5
 *
 * 当服务器作为网关无法及时获得响应时，会给出此错误响应。
 */
export const GATEWAY_TIMEOUT = "Gateway Timeout";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.9
 *
 * 当请求的内容已从服务器永久删除且没有转发地址时，将发送此响应。客户端应删除其缓存和指向该资源的链接。HTTP规范打算将此状态代码用于"限时促销服务"。API不应被迫使用此状态代码来指示已删除的资源。
 */
export const GONE = "Gone";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.6
 *
 * 请求中使用的HTTP版本不被服务器支持。
 */
export const HTTP_VERSION_NOT_SUPPORTED = "HTTP Version Not Supported";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2324#section-2.3.2
 *
 * 任何尝试用茶壶煮咖啡的行为都应该导致错误代码"418 I'm a teapot"。生成的实体主体可能短而粗。
 */
export const IM_A_TEAPOT = "I'm a teapot";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 507（存储空间不足）状态代码表示由于服务器无法存储成功完成请求所需的表示，因此无法在资源上执行该方法。这种情况被认为是临时的。如果收到此状态代码的请求是用户操作的结果，则必须等到单独的用户操作请求后才能重复该请求。
 */
export const INSUFFICIENT_SPACE_ON_RESOURCE = "Insufficient Space on Resource";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.6
 *
 * 服务器存在内部配置错误：所选的变体资源被配置为自身参与透明内容协商，因此不是协商过程中的适当端点。
 */
export const INSUFFICIENT_STORAGE = "Insufficient Storage";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.1
 *
 * 服务器遇到了阻止其完成请求的意外情况。
 */
export const INTERNAL_SERVER_ERROR = "Internal Server Error";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.10
 *
 * 服务器拒绝请求，因为未定义Content-Length头字段且服务器需要它。
 */
export const LENGTH_REQUIRED = "Length Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.4
 *
 * 正在访问的资源被锁定。
 */
export const LOCKED = "Locked";
/**
 * @deprecated
 * 官方文档 @ https://tools.ietf.org/rfcdiff?difftype=--hwdiff&url2=draft-ietf-webdav-protocol-06.txt
 *
 * Spring框架在方法失败时使用的已弃用响应。
 */
export const METHOD_FAILURE = "Method Failure";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.5
 *
 * 服务器知道请求方法，但已禁用且无法使用。例如，API可能禁止删除资源。两个强制方法GET和HEAD绝不能禁用，也不应返回此错误代码。
 */
export const METHOD_NOT_ALLOWED = "Method Not Allowed";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.2
 *
 * 此响应代码表示请求资源的URI已更改。可能，新URI将在响应中给出。
 */
export const MOVED_PERMANENTLY = "Moved Permanently";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.3
 *
 * 此响应代码表示请求资源的URI已临时更改。将来可能会对URI进行新的更改。因此，客户端应在将来的请求中使用相同的URI。
 */
export const MOVED_TEMPORARILY = "Moved Temporarily";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.2
 *
 * 多状态响应在可能适用多个状态代码的情况下传达有关多个资源的信息。
 */
export const MULTI_STATUS = "Multi-Status";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.1
 *
 * 请求有多个可能的响应。用户代理或用户应选择其中一个。没有标准化的方式来选择一个响应。
 */
export const MULTIPLE_CHOICES = "Multiple Choices";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-6
 *
 * 511状态代码表示客户端需要认证才能获得网络访问权限。
 */
export const NETWORK_AUTHENTICATION_REQUIRED = "Network Authentication Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.5
 *
 * 此请求没有要发送的内容，但标头可能有用。用户代理可以使用新的标头更新此资源的缓存标头。
 */
export const NO_CONTENT = "No Content";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.4
 *
 * 此响应代码表示返回的元信息集不是从源服务器可用的确切集，而是从本地或第三方副本收集的。除了这种情况外，应优先使用200 OK响应而不是此响应。
 */
export const NON_AUTHORITATIVE_INFORMATION = "Non Authoritative Information";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.6
 *
 * 当Web服务器在执行服务器驱动的内容协商后，找不到符合用户代理给定条件的任何内容时，将发送此响应。
 */
export const NOT_ACCEPTABLE = "Not Acceptable";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.4
 *
 * 服务器找不到请求的资源。在浏览器中，这意味着URL无法识别。在API中，这也可能意味着端点有效但资源本身不存在。服务器也可能发送此响应而不是403，以向未授权的客户端隐藏资源的存在。由于在网络上频繁出现，这可能是最著名的响应代码。
 */
export const NOT_FOUND = "Not Found";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.2
 *
 * 服务器不支持请求的方法，无法处理。服务器必须支持的方法（因此不能返回此代码的方法）只有GET和HEAD。
 */
export const NOT_IMPLEMENTED = "Not Implemented";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.1
 *
 * 这用于缓存目的。它告诉客户端响应尚未被修改。因此，客户端可以继续使用相同的缓存版本的响应。
 */
export const NOT_MODIFIED = "Not Modified";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.1
 *
 * 请求已成功。成功的含义取决于HTTP方法：
 * GET：资源已被获取并在消息正文中传输。
 * HEAD：实体头部在消息正文中。
 * POST：描述操作结果的资源在消息正文中传输。
 * TRACE：消息正文包含服务器接收到的请求消息
 */
export const OK = "OK";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.1
 *
 * 此响应代码用于客户端发送的范围头字段，将下载分成多个流。
 */
export const PARTIAL_CONTENT = "Partial Content";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.2
 *
 * 此响应代码保留供将来使用。创建此代码的最初目的是将其用于数字支付系统，但目前尚未使用。
 */
export const PAYMENT_REQUIRED = "Payment Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7538#section-3
 *
 * 这意味着资源现在永久位于由Location: HTTP响应头指定的另一个URI。这与301 Moved Permanently HTTP响应代码具有相同的语义，但有一个例外，用户代理不得更改使用的HTTP方法：如果第一个请求中使用了POST，那么第二个请求中也必须使用POST。
 */
export const PERMANENT_REDIRECT = "Permanent Redirect";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7232#section-4.2
 *
 * 客户端在其头部指定了服务器不满足的先决条件。
 */
export const PRECONDITION_FAILED = "Precondition Failed";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-3
 *
 * 源服务器要求请求是有条件的。旨在防止"丢失更新"问题，即客户端获取资源状态，修改它，然后将其放回服务器，而同时第三方已经修改了服务器上的状态，导致冲突。
 */
export const PRECONDITION_REQUIRED = "Precondition Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.1
 *
 * 此代码表明服务器已收到并正在处理请求，但尚无响应可用。
 */
export const PROCESSING = "Processing";
/**
 * 官方文档 @ https://www.rfc-editor.org/rfc/rfc8297#page-3
 *
 * 此代码向客户端表明服务器很可能会发送包含信息性响应中包含的头字段的最终响应。
 */
export const EARLY_HINTS = "Early Hints";
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.15
 *
 * 服务器拒绝使用当前协议执行请求，但在客户端升级到不同协议后可能愿意这样做。
 */
export const UPGRADE_REQUIRED = "Upgrade Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.2
 *
 * 这类似于401，但需要由代理进行身份验证。
 */
export const PROXY_AUTHENTICATION_REQUIRED = "Proxy Authentication Required";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-5
 *
 * 服务器不愿处理请求，因为其头字段太大。请求可能在减小请求头字段的大小后重新提交。
 */
export const REQUEST_HEADER_FIELDS_TOO_LARGE = "Request Header Fields Too Large";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.7
 *
 * 此响应由一些服务器在空闲连接上发送，即使没有任何来自客户端的先前请求。这意味着服务器希望关闭这个未使用的连接。自从一些浏览器，如Chrome、Firefox 27+或IE9，使用HTTP预连接机制来加速浏览，此响应被更多地使用。另请注意，一些服务器仅关闭连接而不发送此消息。
 */
export const REQUEST_TIMEOUT = "Request Timeout";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.11
 *
 * 请求实体大于服务器定义的限制；服务器可能会关闭连接或返回Retry-After头字段。
 */
export const REQUEST_TOO_LONG = "Request Entity Too Large";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.12
 *
 * 客户端请求的URI长于服务器愿意解释的长度。
 */
export const REQUEST_URI_TOO_LONG = "Request-URI Too Long";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7233#section-4.4
 *
 * 请求中Range头字段指定的范围无法满足；可能是该范围超出了目标URI数据的大小。
 */
export const REQUESTED_RANGE_NOT_SATISFIABLE = "Requested Range Not Satisfiable";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.3.6
 *
 * 此响应代码在完成请求后发送，用于告诉用户代理重置发送此请求的文档视图。
 */
export const RESET_CONTENT = "Reset Content";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.4
 *
 * 服务器发送此响应，指示客户端通过GET请求获取请求的资源到另一个URI。
 */
export const SEE_OTHER = "See Other";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.6.4
 *
 * 服务器尚未准备好处理请求。常见原因是服务器因维护而停机或过载。请注意，与此响应一起，应发送一个用户友好的页面解释问题。这些响应应用于临时条件，如果可能，Retry-After: HTTP头应包含服务恢复前的估计时间。网站管理员还必须注意与此响应一起发送的与缓存相关的头，因为这些临时条件响应通常不应被缓存。
 */
export const SERVICE_UNAVAILABLE = "Service Unavailable";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.2.2
 *
 * 此代码作为对客户端的Upgrade请求头的响应发送，并指示服务器正在切换到的协议。
 */
export const SWITCHING_PROTOCOLS = "Switching Protocols";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.7
 *
 * 服务器发送此响应，指示客户端使用与先前请求相同的方法获取请求的资源到另一个URI。这与302 Found HTTP响应代码具有相同的语义，但有一个例外，用户代理不得更改使用的HTTP方法：如果第一个请求中使用了POST，那么第二个请求中也必须使用POST。
 */
export const TEMPORARY_REDIRECT = "Temporary Redirect";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc6585#section-4
 *
 * 用户在给定时间内发送了太多请求（"速率限制"）。
 */
export const TOO_MANY_REQUESTS = "Too Many Requests";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7235#section-3.1
 *
 * 尽管HTTP标准规定为"未授权"，但从语义上讲，此响应意味着"未认证"。即，客户端必须进行身份验证才能获得请求的响应。
 */
export const UNAUTHORIZED = "Unauthorized";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7725
 *
 * 用户代理请求了一个不能合法提供的资源，例如被政府审查的网页。
 */
export const UNAVAILABLE_FOR_LEGAL_REASONS = "Unavailable For Legal Reasons";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc2518#section-10.3
 *
 * 请求格式良好，但由于语义错误而无法遵循。
 */
export const UNPROCESSABLE_ENTITY = "Unprocessable Entity";
/**
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.5.13
 *
 * 服务器不支持请求数据的媒体格式，因此服务器拒绝请求。
 */
export const UNSUPPORTED_MEDIA_TYPE = "Unsupported Media Type";
/**
 * @deprecated
 * 官方文档 @ https://tools.ietf.org/html/rfc7231#section-6.4.6
 *
 * 在HTTP规范的早期版本中定义，表示必须通过代理访问请求的响应。由于关于带内代理配置的安全问题，它已被弃用。
 */
export const USE_PROXY = "Use Proxy";
/**
 * 官方文档 @ https://datatracker.ietf.org/doc/html/rfc7540#section-9.1.2
 *
 * 在HTTP/2规范中定义，表示服务器无法为请求URI中包含的方案和权限组合生成响应。
 */
export const MISDIRECTED_REQUEST = "Misdirected Request";
