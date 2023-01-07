const config = {
//控制 HTTP referer header，如果你想创建一个隐藏 HTTP Referer header 的匿名链接，请设置为“on”。
no_ref: "on", 
//首页主题，默认主题为空。 要使用其它主题，请填写 "theme/name" 。
theme:"",
//是否允许API请求的跨源资源共享。
cors: "on",
//相同的长url是否使用同一个短url。
unique_link:true,
//允许用户自定义短url。
custom_link:true,
//输入 Google 安全浏览 API 密钥以在重定向前启用 url 安全检查。
safe_browsing_api_key: "" 
}

const html404 = `<!DOCTYPE html>
<body>
  <h1>404 Not Found.</h1>
  <p>The url you visit is not found.</p>
  <a href="https://github.com/xramas/Urlcreate/" target="_self">Fork me on GitHub</a>
</body>`

let response_header={
  "content-type": "text/html;charset=UTF-8",
} 

if (config.cors=="on"){
  response_header={
  "content-type": "text/html;charset=UTF-8",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods": "POST",
  }
}

async function randomString(len) {
　　len = len || 6;
　　let $chars = 'ABCDEFGHKLMNOPRSTUVWXYZabcdehikmnorstuvwxz023456789';    /****去除了：I\J\Q\f\g\j\l\p\q\y****/
　　let maxPos = $chars.length;
　　let result = '';
　　for (i = 0; i < len; i++) {
　　　　result += $chars.charAt(Math.floor(Math.random() * maxPos));
　　}
　　return result;
}

async function sha512(url){
    url = new TextEncoder().encode(url)

    const url_digest = await crypto.subtle.digest(
      {
        name: "SHA-512",
      },
      url, //您要散列为 ArrayBuffer 的数据
    )
    const hashArray = Array.from(new Uint8Array(url_digest)); //将缓冲区转换为字节数组
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    //console.log(hashHex)
    return hashHex
}
async function checkURL(URL){
    let str=URL;
    let Expression=/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
    let objExp=new RegExp(Expression);
    if(objExp.test(str)==true){
      if (str[0] == 'h')
        return true;
      else
        return false;
    }else{
        return false;
    }
} 
async function save_url(URL){
    let random_key=await randomString()
    let is_exist=await LINKS.get(random_key)
    console.log(is_exist)
    if (is_exist == null)
        return await LINKS.put(random_key, URL),random_key
    else
        save_url(URL)
}
async function is_url_exist(url_sha512){
  let is_exist = await LINKS.get(url_sha512)
  console.log(is_exist)
  if (is_exist == null) {
    return false
  }else{
    return is_exist
  }
}
async function is_url_safe(url){

  let raw = JSON.stringify({"client":{"clientId":"Url-Shorten-Worker","clientVersion":"1.0.7"},"threatInfo":{"threatTypes":["MALWARE","SOCIAL_ENGINEERING","POTENTIALLY_HARMFUL_APPLICATION","UNWANTED_SOFTWARE"],"platformTypes":["ANY_PLATFORM"],"threatEntryTypes":["URL"],"threatEntries":[{"url":url}]}});

  let requestOptions = {
    method: 'POST',
    body: raw,
    redirect: 'follow'
  };

  result = await fetch("https://safebrowsing.googleapis.com/v4/threatMatches:find?key=AIzaSyB9hnLmYPihUefkSl9Mnxui35NDCJVw650", requestOptions)
  result = await result.json()
  console.log(result)
  if (Object.keys(result).length === 0){
    return true
  }else{
    return false
  }
}
async function handleRequest(request) {
  console.log(request)
  if (request.method === "POST") {
    let req=await request.json()
    console.log(req["url"])
    if(!await checkURL(req["url"])){
    return new Response(`{"status":500,"key":": Error: Url illegal."}`, {
      headers: response_header,
    })}
    let stat,random_key
    if (config.unique_link){
      let url_sha512 = await sha512(req["url"])
      let url_key = await is_url_exist(url_sha512)
      if(url_key){
        random_key = url_key
      }else{
        stat,random_key=await save_url(req["url"])
        if (typeof(stat) == "undefined"){
          console.log(await LINKS.put(url_sha512,random_key))
        }
      }
    }else{
      stat,random_key=await save_url(req["url"])
    }
    console.log(stat)
    if (typeof(stat) == "undefined"){
      return new Response(`{"status":200,"key":"/`+random_key+`"}`, {
      headers: response_header,
    })
    }else{
      return new Response(`{"status":200,"key":": Error:Reach the KV write limitation."}`, {
      headers: response_header,
    })}
  }else if(request.method === "OPTIONS"){  
      return new Response(``, {
      headers: response_header,
    })

  }

  const requestURL = new URL(request.url)
  const path = requestURL.pathname.split("/")[1]
  const params = requestURL.search;

  console.log(path)
  if(!path){

    const html= await fetch("https://xramas.github.io/Pages/Urlcreate/"+config.theme+"/index.html")
    
    return new Response(await html.text(), {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  })
  }

  const value = await LINKS.get(path);
  let location ;

  if(params) {
    location = value + params
  } else {
      location = value
  }
  console.log(value)
  

  if (location) {
    if (config.safe_browsing_api_key){
      if(!(await is_url_safe(location))){
        let warning_page = await fetch("https://xramas.github.io/Pages/Urlcreate/safe-browsing.html")
        warning_page =await warning_page.text()
        warning_page = warning_page.replace(/{Replace}/gm, location)
        return new Response(warning_page, {
          headers: {
            "content-type": "text/html;charset=UTF-8",
          },
        })
      }
    }
    if (config.no_ref=="on"){
      let no_ref= await fetch("https://xramas.github.io/Pages/Urlcreate/no-ref.html")
      no_ref=await no_ref.text()
      no_ref=no_ref.replace(/{Replace}/gm, location)
      return new Response(no_ref, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })
    }else{
      return Response.redirect(location, 302)
    }
    
  }
  // If request not in kv, return 404
  return new Response(html404, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
    status: 404
  })
}



addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})
