'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const e = require('express');
const SteinStore = require("stein-js-client");
const store = new SteinStore("");

const PORT = process.env.PORT || 3000;

const config = {
    channelSecret: '',
    channelAccessToken: ''
};

const app = express();

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);

    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result));
});

const client = new line.Client(config);

let point = 0;
let bodyWeight = 0;

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  let message = {
    type: 'text',
    text: event.message.text
  };
  if(event.message.text === '体重設定'){
    message = {
      "type": "text",
      "text": "体重を設定します。半角で数字のみ入力してください。"
    };
  }
  if(event.message.text>30 && event.message.text<120){
    bodyWeight = event.message.text;
    message = {
      "type": "text",
      "text": "体重を"+ bodyWeight +"kgで設定しました。\n心不全確認を行いましょう。"
    };
  }
  if (event.message.text === '心不全確認') {
    //スプレッドシートにuserIdが登録されている場合はその体重を。
    bodyWeight = Number(bodyWeight) + 2;
    message = {
      "type": "template",
      "altText": "this is a confirm template",
      "template": {
        "type": "confirm",
        "actions": [
          {
            "type": "message",
            "label": "維持",
            "text": "維持"
          },
          {
            "type": "message",
            "label": "増加",
            "text": "増加"
          }
        ],
        "text": "体重は" + bodyWeight + "kg以内を維持できていますか？"
      }
    };
    bodyWeight = Number(bodyWeight) - 2;
  }
  if (event.message.text === '増加'){
    point += 3;
  }
  if (event.message.text === '維持' || event.message.text === '増加'){
    message = {
      "type": "template",
      "altText": "this is a confirm template",
      "template": {
        "type": "confirm",
        "actions": [
          {
            "type": "message",
            "label": "未満",
            "text": "未満"
          },
          {
            "type": "message",
            "label": "以上",
            "text": "以上"
          }
        ],
        "text": "脈拍は120回/分未満ですか？"
      }
    };
  }
  if (event.message.text === '以上'){
    point += 4;
  }
  if (event.message.text === '未満' || event.message.text === '以上'){
    message = {
      "type": "template",
      "altText": "this is a confirm template",
      "template": {
        "type": "confirm",
        "actions": [
          {
            "type": "message",
            "label": "あり",
            "text": "あり"
          },
          {
            "type": "message",
            "label": "なし",
            "text": "なし"
          }
        ],
        "text": "安静時の息切れはありますか？"
      }
    };
  }
  if (event.message.text === 'あり'){
    point += 5;
  }
  if (event.message.text === 'なし' || event.message.text === 'あり'){
    message = {
      "type": "template",
      "altText": "this is a confirm template",
      "template": {
        "type": "confirm",
        "actions": [
          {
            "type": "message",
            "label": "はい",
            "text": "はい"
          },
          {
            "type": "message",
            "label": "いいえ",
            "text": "いいえ"
          }
        ],
        "text": "下記症状が１つでも該当しますか？\n①外出・入浴・階段の息切れ\n②むくみの増悪\n③せきが出る\n④食欲がない"
      }
    };
  }
  if (event.message.text === 'はい'){
    point += 1;
  }
  if (event.message.text === 'はい' || event.message.text === 'いいえ'){
    if(point <= 1){
      message = {
        "type": "text",
        "text": "顕著な心不全の増悪はみとめません。引き続き体調に気をつけてお過ごしください。"
      };
    }else if(point == 3){
      message = {
        "type": "text",
        "text": "軽度の心不全増悪が疑われます。\n近々、主治医に診察してもらいましょう。"
      };
    }else if(point == 4){
      message = {
        "type": "text",
        "text": "中等度の心不全増悪が疑われます。\n本日か明日、外来受診してください。"
      };
    }else{
      message = {
        "type": "text",
        "text": "重度の心不全増悪が疑われます。\n救急外来を受診してください。"
      };
    }
    store.append("sheet1", [
      {
        userID: event.source.userId ,
        date: new Date(),
        weight: bodyWeight,
        score: point
      }
    ]).then(res => { console.log(res); });
    point = 0;
  }
  return client.replyMessage(event.replyToken, message);
}

//ngrok用
app.listen(PORT);
console.log(`Server running at ${PORT}`);

//vercel用
/*
(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
console.log(`Server running at ${PORT}`);
*/
//実行   node management.js