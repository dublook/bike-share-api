# How to start development (for Mac)
## Install node.js
- Install nodebrew for controll node.js version [reference](https://qiita.com/sinmetal/items/154e81823f386279b33c)
- Use `v6.10.3` that AWS Lambda supports

```sh
$ nodebrew install-binary v6.10.3
$ nodebrew use v6.10.3
$ node -v
v6.10.3
```

## Execute npm install
```sh
$ cd bike-share-api
$ npm install
```

## How to run unit test
We chose [AVA](https://github.com/avajs/ava) as test framework.

```sh
$ npm test
# > ava --verbose
#
#
#  ✔ Test example
#
#  1 test passed
```


## Try call api on your local
```sh
$ node execute-local.js ports your_bike_share_member_id your_bike_share_password 1
# => [ { ParkingEntID: 'TYO',
#        ParkingID: '10092',
#        ParkingLat: '35.658911',
#        ParkingLon: '139.792531',
#        portNameJa: 'H1-01.豊洲ＩＨＩビル前（晴海通り）',
#        portNameEn: 'H1-01.Toyosu IHI biru Mae',
#        availableCount: 3 },
```

## Set up awscli
### Install python3
See [here](https://qiita.com/7110/items/1aa5968022373e99ae28)

```
$ brew install python3
```

### Download access key from IAM console for your AWS account
`accessKey.csv` will be downloaded

See [AWS document](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-install-macos.html) for details.

### Install awscli
```
$ pip install awscli
$ aws configure
# AWS Access Key ID [None]:your_access_key_id
# AWS Secret Access Key [None]:your_secret_access_key
# Default region name [None]: ap-northeast-1
# Default output format [None]:json
```

## Install serverless framework
```sh
$ npm install -g serverless
$ sls -v
1.27.2
```

## Init serverless project (You don't have to do this)
```sh
$ sls create --template aws-nodejs
```

## Deploy to aws
```sh
$ sls deploy -v
# You can see endpoint URL in log
```

## Call deployed API
```sh
$ curl -s -d '{"MemberID":"your_bike_share_member_id","Password":"your_bike_share_member_id"}' \
  https://your_endpoint.execute-api.ap-northeast-1.amazonaws.com/dev/areas/3/ports
```
