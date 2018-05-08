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

## Try call api on your local
```sh
$ node index.js your_bike_share_member_id your_bike_share_password 1
# => [ { ParkingEntID: 'TYO',
#        ParkingID: '10092',
#        ParkingLat: '35.658911',
#        ParkingLon: '139.792531',
#        portNameJa: 'H1-01.豊洲ＩＨＩビル前（晴海通り）',
#        portNameEn: 'H1-01.Toyosu IHI biru Mae',
#        availableCount: 3 },
```
