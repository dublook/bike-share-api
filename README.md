# How to start development
## Install node.js
- Install nodebrew for controll node.js version [reference](https://qiita.com/sinmetal/items/154e81823f386279b33c)
- Use `v6.10.3` that AWS Lambda supports

```sh
$ nodebrew install-binary v6.10.3
$ nodebrew use v6.10.3
$ node -v
v6.10.3
```

## Install Headless Chrome/Puppeteer
[Puppeteer documents on GitHub](https://github.com/GoogleChrome/puppeteer)
```sh
$ npm i puppeteer
```
