## 五、数据结构（MVP）

### Civilization

```json
{
  "id": "sinitic",
  "name": "华夏文明",
  "startYear": -2000,
  "endYear": null
}
```

### Polity

```json
{
  "id": "han",
  "name": "汉",
  "civilizationId": "sinitic",
  "startYear": -202,
  "endYear": 220
}
```

### Event

```json
{
  "id": "qin_unification",
  "name": "秦统一六国",
  "type": "point",
  "year": -221,
  "relatedPolities": ["qin"]
}
```
按照此数据格式，将https://zh.wikipedia.org/wiki/%E4%B8%AD%E5%9B%BD%E5%8E%86%E5%8F%B2%E5%B9%B4%E8%A1%A8网页上的信息汇总出来