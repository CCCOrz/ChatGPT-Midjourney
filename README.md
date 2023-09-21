
## 原始项目

[ChatGPT-Next-Web](https://github.com/Yidadaa/ChatGPT-Next-Web)

[ChatGPT-Midjourney](https://github.com/Licoy/ChatGPT-Midjourney)

## 额外功能
- [x] 更换主题色
- [ ] ...

## 部署
```
docker run -d -p 3000:3000 \
   -e OPENAI_API_KEY="sk-xxx" \
   -e BASE_URL="https://api.openai.com" \
   -e MJ_SERVER_ID="" \
   -e MJ_CHANNEL_ID="" \
   -e MJ_USER_TOKEN="" \
   --name chat-next-midjourney-web \
   durianice/chat-next-midjourney-web
```

## 开发
```
yarn && yarn dev
```

## 开源协议
[MIT](./LICENSE)
