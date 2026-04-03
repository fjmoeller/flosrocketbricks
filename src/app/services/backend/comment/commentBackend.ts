export interface Env {
  DB: D1Database;
  RATE_LIMITER: {
    limit: (opts: { key: string }) => Promise<{ success: boolean }>;
  };
  KILLSWITCH_ALL: string;
  KILLSWITCH_GET: string;
  KILLSWITCH_CHANGE: string;
  COMMENT_ADMIN_PASSWORD: string;
  COMMENT_ADMIN_NAME: string;
}

//DATABASE
interface UserRow {
  userId: number;
  auth: string;
}

//GET

interface CommentRow {
  commentId: number;
  userId: number;
  username: string;
  content: string;
  time: number;
  postKey: string; //eg. M-201
  replySeen?: boolean;
  replyCommentId?: number;
}

//POST

interface CommentCreateRequest {
  userId: string;
  username: string;
  auth: string;
  content: string;
  replyCommentId?: number;
}

//PUT

interface CommentEditRequest {
  commentId: number;
  auth: string;
  content: string;
}

interface CommentSeenRequest {
  userId: string;
  auth: string;
  commentId: number;
}

//DELETE

interface CommentDeleteRequest {
  commentId: number;
  auth?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ipAddress = request.headers.get("cf-connecting-ip") ?? "";
    const { success } = await env.RATE_LIMITER.limit({ key: ipAddress });
    if (!success) return new Response("429 Rate limit exceeded", { status: 429 });

    if (env.KILLSWITCH_ALL === "true")
      return new Response("503 Service Unavailable", { status: 503 });

    const urlParts = new URL(request.url).pathname.split("/");
    const keyFromUrl = urlParts[urlParts.length - 1];

    const validKey = /^([MBC]-\d+|adminAll)$/.test(keyFromUrl);
    if (!validKey) return new Response("Not found", { status: 404 });

    if (request.method === "GET") {
      return handleGet(request, env, keyFromUrl);
    }

    if (request.method === "POST") {
      return handlePost(request, env, keyFromUrl);
    }

    if (request.method === "DELETE") {
      return handleDelete(request, env, keyFromUrl);
    }

    if (request.method === "PUT") {
      return handlePut(request, env, keyFromUrl);
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};

//TODO chagne fronent to user adminAuth instead of adminPassword

/**
 * TODO:
 * check if: all X-000 U-000
 */
async function handleGet(request: Request, env: Env, key: string) {
  if (env.KILLSWITCH_GET === "true")
    return new Response("503 Service Unavailable", { status: 503 });

  if(key === "all") { //TODO change in frontend path to all

    const isAdmin =
      request.headers.get("adminAuth") === env.COMMENT_ADMIN_PASSWORD;
    if(!isAdmin) return new Response("Unauthorized", { status: 401 });

    const { results } = await env.DB.prepare(
      `SELECT commentId, userId, username, content, time, postKey, replySeen, replyCommentId
		 		FROM comments
		 		ORDER BY postKey, commentId`
    ).all<CommentRow>();
    //packt alle comments in arrays die zum post gehören
    const grouped: Record<string, unknown[]> = {};
    for (const row of results) {
      if (!grouped[row.postKey]) grouped[row.postKey] = [];
      grouped[row.postKey].push(row);
    }
    return json(
      Object.entries(grouped).map(([key, value]) => ({ key, value }))
    );
  }
  else if(/^[CBM]-[0-9]+$/.test(key)){ //MOC based
    const { results } = await env.DB.prepare(
      `SELECT commentId, userId, username, content, time, postKey, replySeen, replyCommentId
		 		FROM comments
			 	WHERE postKey = ?
		 		ORDER BY commentId ASC`
    ).bind(key).all<CommentRow>();
    return json(results);

  }
  else if(/^[U]-[0-9]+$/.test(key)) {
    //USER based
    //TODO if authenticated by user
    //TODO fetch auth of user
    const isAdmin =
      request.headers.get("adminAuth") === env.COMMENT_ADMIN_PASSWORD;
    if(!isAdmin) return new Response("Unauthorized", { status: 401 });

    //TODO fix query
    //select comments of user with userId
    //select all comments with replyCommentId being on of the replies
    const { results } = await env.DB.prepare(
      `SELECT commentId, userId, username, content, time, postKey, replySeen, replyCommentId
			 FROM comments
			 WHERE userId = ?
			 ORDER BY commentId ASC`
    ).bind(key).all<CommentRow>();

    return json(results);
  }
  else{
    return new Response("Not found", { status: 404 });
  }
}

/**
 * TODO:
 * check if: UserCreateRequest CommentCreateRequest
 */
async function handlePost(request: Request, env: Env, key: string) {
  if (env.KILLSWITCH_CHANGE === "true")
    return new Response("503 Service Unavailable", { status: 503 });

  const body = (await request.json()) as CommentCreateRequest;

  //TODO at creation dont allow name "SkySaac" and make secret name into SkySaac
  if(/^[CBM]-[0-9]+$/.test(key)){ //create comment
    if (!body?.userId || !body?.username || !body?.auth || !body?.content)
      return new Response("Bad request", { status: 400 });

    const user = await env.DB.prepare(
      `SELECT auth
		 FROM users
		 WHERE userId = ?`
    ).bind(body.userId).first<{ auth: string }>();
    if (user?.auth !== body.auth || request.headers.get("adminAuth") === env.COMMENT_ADMIN_PASSWORD)
      return new Response("Unauthorized", { status: 401 });

    const sanitizedUsername = sanitizeUsername(body.username, env);
    const sanitizedContent = sanitize(body.content);
    const timestamp = Math.floor(Date.now() / 1000);

    //TODO create commentId sequentially

    const result = await env.DB.prepare(
      `INSERT INTO comments (commentId, userId, username, content, time, postKey, replySeen, replyCommentId)
		 VALUES (?, ?, ?, ?, ?, ?, ? , ?)`
    )
      .bind(commentId, body.userId,sanitizedUsername, sanitizedContent, timestamp, key ,body.replyCommentId?false:null,body.replyCommentId ?? null)
      .run();

    return json(
      result,
      201
    );
  }
  else if (key === "createUser"){
    //user create request
    if (!body?.auth)
      return new Response("Bad request", { status: 400 });

    //TODO create userid sequentially

    const result = await env.DB.prepare(
      `INSERT INTO users (userId, auth)
		 	VALUES (?, ?)`
    )
      .bind(userId, body.auth)
      .run();

    return json(result);

  }
  else{
    return new Response("Not found", { status: 404 });
  }
}

async function handleDelete(request: Request, env: Env, key: string) {
  const body = (await request.json()) as CommentDeleteRequest;

  //if body malformed
  if (!body?.commentId)
    return new Response("Bad request", { status: 400 });

  //get associated userId
  const referredUserId = await env.DB.prepare(
    `SELECT userId FROM comments WHERE commentId = ? AND postKey = ?`
  )
    .bind(body.commentId, key)
    .first<{ userId: string }>();
  if (!referredUserId)
    return new Response("Bad request", { status: 400 });

  //get user to userId
  const referredUser = await env.DB.prepare(
    `SELECT auth FROM users WHERE userId = ?`
  )
    .bind(referredUserId.userId)
    .first<{ auth:string }>();
  if (!referredUser)
    return new Response("Bad request", { status: 400 });

  //check if authorized (if auth equals)
  if(referredUser.auth !== body.auth || request.headers.get("adminAuth") === env.COMMENT_ADMIN_PASSWORD)
    return new Response("Unauthorized", { status: 401 });

  await env.DB.prepare(
    `DELETE FROM comments WHERE commentId = ? AND postKkey = ?`
  )
    .bind(body.commentId, key)
    .run();

  return new Response(null, { status: 204 });
}

//TODO add user seen request
async function handlePut(request: Request, env: Env, key: string) {
  const body = (await request.json()) as CommentEditRequest;

  if (!body?.commentId || !body?.auth || !body?.content)
    return new Response("Bad request", { status: 400 });

  const comment = await env.DB.prepare(
    `SELECT userId
		 FROM comments
		 WHERE commentId = ? AND postKey = ?`
  )
    .bind(body.commentId, key)
    .first<{ userId: string }>();

  if (!comment)
    return new Response("Bad request", { status: 400 });

  const user = await env.DB.prepare(
    `SELECT auth
		 FROM users
		 WHERE userId = ?`
  )
    .bind(comment.userId)
    .first<{ auth: string }>();

  if (user?.auth !== body.auth || request.headers.get("adminAuth") === env.COMMENT_ADMIN_PASSWORD)
    return new Response("Unauthorized", { status: 401 });

  const sanitizedContent = sanitize(body.content);
  const newTime: number = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `UPDATE comments
		 SET content = ?
		 WHERE id = ? AND post_key = ?`
  ).bind(sanitizedContent, body.commentId, key)
    .run();

  await env.DB.prepare(
    `UPDATE time
		 SET time = ?
		 WHERE id = ? AND post_key = ?`
  ).bind(newTime, body.commentId, key)
    .run();

  return json({
    id: body.commentId,
    user: comment.userId,
    content: sanitizedContent,
    time: newTime
  });
}

//TODO verify tht its corret against html AND SQL stuff
function sanitize(input: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };
  return input.replace(/[&<>"'/]/g, (m) => map[m]);
}

//TODO verify tht its corret against html AND SQL stuff
function sanitizeUsername(username: string, env: Env): string {
  let name = sanitize(username.trim());
  if (name.toLowerCase() === "skysaac" || name === "")
    name = "Anonymus";
  else if (name === env.COMMENT_ADMIN_NAME)
    name = "SkySaac";
  return sanitize(name);
}

function json(data: unknown, status = 200) {
  const res = new Response(JSON.stringify(data), { status });
  res.headers.set("Content-Type", "application/json");
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.append("Vary", "Origin");
  return res;
}
