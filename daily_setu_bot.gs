const baseUrl = "";
const baseSecret = "";
const apiUrl = "";
let base = FirebaseApp.getDatabaseByUrl(baseUrl, baseSecret);

function setData (key, value)
{
    base.setData(key, value);
}

function updateData (key, value)
{
    base.updateData(key, value);
}

function pushData (key, value)
{
    base.pushData(key, value);
}

function getData (target)
{
    target = target || null;
    if (target !== null)
    {
        return base.getData(target);
    }
    else
    {
        return base.getData();
    }
}

function sendPerFiveMinutes()
{
  initSetuReal("fiveMinutes");
}

function sendPerHour()
{
  initSetu("oneHour");
}

function initSetu (rate)
{
    let ChatIds = getChatIds(rate);
    let setu = JSON.parse(getSetu().getContentText());
    if (setu["error"] != '')
    {
        return;
    }
    setu = setu["data"][0];
    for (chatId in ChatIds)
    {
        sendSetu(ChatIds[chatId], setu, ChatIds[chatId]["notification"]);
    }
}

function initSetuReal (rate)
{
    let ChatIds = getChatIds(rate);
    let setu = JSON.parse(getSetuReal().getContentText());
    if (setu["code"] !== 200) return
    setu = setu["url"]
    for (chatId in ChatIds)
    {
      sendSetuReal(ChatIds[chatId], setu, ChatIds[chatId]["notification"]);
    }
}

function sendSetu (chatId, setu, disable_notification)
{    
    let caption = setCaption(setu);
    let payload = {
        "chat_id": chatId,
        "photo": setu["urls"]["original"],
        "caption": caption,
        "parse_mode": "HTML",
        "disable_notification": disable_notification,
        "reply_markup":
        {
            "inline_keyboard": [
                [
                {
                    "text": "PID:" + String(setu["pid"]),
                    "url": "https://www.pixiv.net/artworks/" + setu["pid"]
                },
                {
                    "text": "作者:" + String(setu["author"]),
                    "url": "https://www.pixiv.net/users/" + setu["uid"]
                }]
            ]
        }
    }
    let req = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload)
    }
    try
    {
        UrlFetchApp.fetch(apiUrl + "sendPhoto", req);
    }
    catch(ex)
    {
        let patt = new RegExp("\{.*\}");
        let ret = JSON.parse(patt.exec(ex["message"])[0]);
        if(ret["ok"] === false && ret["error_code"] === 403)
        {
            setData("chatIds/" + chatId + "/rate", "False");
        }
    }
}

function sendSetuReal (chatId, setu, disable_notification)
{    
    let payload = {
        "chat_id": chatId,
        "photo": setu,
        "caption": '随机美图',
        "parse_mode": "HTML",
        "disable_notification": disable_notification
    }
    let req = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload)
    }
    try
    {
        UrlFetchApp.fetch(apiUrl + "sendPhoto", req);
    }
    catch(ex)
    {
        let patt = new RegExp("\{.*\}");
        let ret = JSON.parse(patt.exec(ex["message"])[0]);
        if(ret["ok"] === false && ret["error_code"] === 403)
        {
            setData("chatIds/" + chatId + "/rate", "False");
        }
    }
}

function getChatIds (rate)
{
    let data = getData("chatIds");
    let ids = [];
    for (let id in data)
    {
        if (data[id]["rate"] === rate)
        {
            ids.push(id);
        }
    }
    return ids
}

function setCaption (setu)
{
    let caption = "<strong>" + setu["title"] + "</strong>\n";
    for (let tag in setu["tags"])
    {
        caption += " #" + setu["tags"][tag];
    }
    return caption;
}

function getSetu ()
{
    let payload = {
        "r18": 2,
        "num": 1
    }
    let data = {
        "method": "get",
        "payload": payload
    }
    return UrlFetchApp.fetch("https://api.lolicon.app/setu/v2", data);
}

function getSetuReal()
{
  // mode=1 | 微博美女图，公共图床速度快~(24000+图) 
  // mode=2 | IG图包(55000+图)，收集Instagram美女图
  // mode=3 | cos美女图(10596张图)
  // mode=66 | 随机美女图，10W+(部分露点)
  // mode=5 | Mtcos美女图(14000+张图)
  // mode=7 | 美腿
  // mode=8 | 40000张按Coser分类图片
  // mode=9 | 兔玩映画5000+图 
  // mode=1,3,5 | 多选 |
    return UrlFetchApp.fetch("https://3650000.xyz/api/?type=json&mode=66,7,9");
}

function sendMessage (chat_id, text)
{
    UrlFetchApp.fetch(apiUrl + "sendMessage",
    {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(
        {
            "chat_id": chat_id,
            "text": text
        })
    });
}

function isInPrivate (data)
{
    if (data["message"]["chat"]["type"] !== "private")
    {
        sendMessage(data["message"]["chat"]["id"], "此命令只支持私聊使用");
        return false;
    }
    return true;
}

function isInGroup (data)
{
    if (data["message"]["chat"]["type"] !== "group" && data["message"]["chat"]["type"] !== "supergroup")
    {
        sendMessage(data["message"]["chat"]["id"], "此命令只支持群聊使用");
        return false;
    }
    return true;
}

function isAdmin (data)
{
    let member = JSON.parse(UrlFetchApp.fetch(apiUrl + "getChatMember",
    {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(
        {
            "chat_id": data["message"]["chat"]["id"],
            "user_id": data["message"]["from"]["id"]
        })
    }));
    if (member["result"]["status"] === "creator" || member["result"]["status"] === "administrator")
    {
        return true;
    }
    sendMessage(data["message"]["chat"]["id"], "只有管理员才能使用此命令");
    return false;
}

function doPost (e)
{
    let data = JSON.parse(e.postData.contents);
    if (data.hasOwnProperty("message"))
    {
        switch (data["message"]["text"])
        {
            case "/start":
            case "/start@daily_setu_bot":
                if (isInPrivate(data))
                {
                    sendMessage(data["message"]["chat"]["id"], "欢迎使用1！");
                  sendPerFiveMinutes()
                }
                break;
            case "/onforme":
            case "/onforme@daily_setu_bot":
                if (isInPrivate(data))
                {
                    setData("chatIds/" + data["message"]["from"]["id"] + "/notification", "True");
                    setData("chatIds/" + data["message"]["from"]["id"] + "/rate", "fiveMinutes");
                    sendMessage(data["message"]["chat"]["id"], "订阅成功");
                }
                break;
            case "/offforme":
            case "/offforme@daily_setu_bot":
                if (isInPrivate(data))
                {
                    setData("chatIds/" + data["message"]["from"]["id"] + "/rate", "False");
                    sendMessage(data["message"]["chat"]["id"], "取消订阅成功")
                }
                break;
            case "/onforhere":
            case "/onforhere@daily_setu_bot":
                if (isInGroup(data) && isAdmin(data))
                {
                    setData("chatIds/" + data["message"]["from"]["id"] + "/notification", "True");
                    setData("chatIds/" + data["message"]["chat"]["id"] + "/rate", "fiveMinutes");
                    sendMessage(data["message"]["chat"]["id"], "订阅成功");
                }
                break;
            case "/offforhere":
            case "/offforhere@daily_setu_bot":
                if (isInGroup(data) && isAdmin(data))
                {
                    setData("chatIds/" + data["message"]["chat"]["id"] + "/rate", "False");
                    sendMessage(data["message"]["chat"]["id"], "取消订阅成功");
                }
                break;
            case "/settings":
            case "/settings@daily_setu_bot":
                if (((data["message"]["chat"]["type"] === "group" || data["message"]["chat"]["type"] === "supergroup") && isAdmin(data)) || isInPrivate(data))
                {
                    let payload = {
                        "chat_id": data["message"]["chat"]["id"],
                        "text": "请选择要更改的设置",
                        "reply_markup":
                        {
                            "inline_keyboard": [
                                [
                                {
                                    "text": "更改发送频率",
                                    "callback_data": "changeRate"
                                },
                                {
                                    "text": "静默推送设置",
                                    "callback_data": "notification"
                                }]
                            ]
                        }
                    }
                    let req = {
                        "method": "post",
                        "contentType": "application/json",
                        "payload": JSON.stringify(payload)
                    }
                    UrlFetchApp.fetch(apiUrl + "sendMessage", req);
                }
        }
    }
    else if (data.hasOwnProperty("callback_query"))
    {
        switch (data["callback_query"]["data"])
        {
            case "changeRate":
                UrlFetchApp.fetch(apiUrl + "editMessageText",
                {
                    "method": "post",
                    "contentType": "application/json",
                    "payload": JSON.stringify(
                    {
                        "chat_id": data["callback_query"]["message"]["chat"]["id"],
                        "message_id": data["callback_query"]["message"]["message_id"],
                        "text": "请选择频率"
                    })
                });
                UrlFetchApp.fetch(apiUrl + "editMessageReplyMarkup",
                {
                    "method": "post",
                    "contentType": "application/json",
                    "payload": JSON.stringify(
                    {
                        "chat_id": data["callback_query"]["message"]["chat"]["id"],
                        "message_id": data["callback_query"]["message"]["message_id"],
                        "reply_markup":
                        {
                            "inline_keyboard": [
                                [
                                {
                                    "text": "5分钟",
                                    "callback_data": "fiveMinutes"
                                },
                                {
                                    "text": "1小时",
                                    "callback_data": "oneHour"
                                }]
                            ]
                        }
                    })
                });
                answerCallbackQuery(data["callback_query"]["id"]);
                break;
            case "fiveMinutes":
                setData("chatIds/" + data["callback_query"]["message"]["chat"]["id"] + "/rate", "fiveMinutes");
                answerCallbackQuery(data["callback_query"]["id"]);
                deleteMessage(data["callback_query"]["message"]["chat"]["id"], data["callback_query"]["message"]["message_id"]);
                break;
            case "oneHour":
                setData("chatIds/" + data["callback_query"]["message"]["chat"]["id"] + "/rate", "oneHour");
                answerCallbackQuery(data["callback_query"]["id"]);
                deleteMessage(data["callback_query"]["message"]["chat"]["id"], data["callback_query"]["message"]["message_id"]);
                break;
            case "notification":
                UrlFetchApp.fetch(apiUrl + "editMessageText",
                {
                    "method": "post",
                    "contentType": "application/json",
                    "payload": JSON.stringify(
                    {
                        "chat_id": data["callback_query"]["message"]["chat"]["id"],
                        "message_id": data["callback_query"]["message"]["message_id"],
                        "text": "是否启用静默推送？"
                    })
                });
                UrlFetchApp.fetch(apiUrl + "editMessageReplyMarkup",
                {
                    "method": "post",
                    "contentType": "application/json",
                    "payload": JSON.stringify(
                    {
                        "chat_id": data["callback_query"]["message"]["chat"]["id"],
                        "message_id": data["callback_query"]["message"]["message_id"],
                        "reply_markup":
                        {
                            "inline_keyboard": [
                                [
                                {
                                    "text": "是",
                                    "callback_data": "disableNotification"
                                },
                                {
                                    "text": "否",
                                    "callback_data": "enableNotification"
                                }]
                            ]
                        }
                    })
                });
                answerCallbackQuery(data["callback_query"]["id"]);
                break;
            case "disableNotification":
                setData("chatIds/" + data["callback_query"]["message"]["chat"]["id"] + "/notification", "True");
                answerCallbackQuery(data["callback_query"]["id"]);
                deleteMessage(data["callback_query"]["message"]["chat"]["id"], data["callback_query"]["message"]["message_id"]);
                break;
            case "enableNotification":
                setData("chatIds/" + data["callback_query"]["message"]["chat"]["id"] + "/notification", "False");
                answerCallbackQuery(data["callback_query"]["id"]);
                deleteMessage(data["callback_query"]["message"]["chat"]["id"], data["callback_query"]["message"]["message_id"]);
                break;
        }
    }
}

function answerCallbackQuery (callback_id)
{
    UrlFetchApp.fetch(apiUrl + "answerCallbackQuery",
    {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(
        {
            "callback_query_id": callback_id,
            "text": "成功"
        })
    });
}

function deleteMessage (chat_id, message_id)
{
    UrlFetchApp.fetch(apiUrl + "deleteMessage",
    {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(
        {
            "chat_id": chat_id,
            "message_id": message_id
        })

    });
}
