## 接入CBDB数据源
### PART1
+ 修改代码，适配表结构的改动：polities -> DYNASTIES，persons -> BIOG_MAIN_CORE
+ 根据程序需要对数据库中的表结构增加索引
+ DYNASTIES和BIOG_MAIN_CORE表已经存在于数据库中

### PART2
+ 修改模型文件命名，与数据库表名保持一致
+ DYNASTIES加一列，civilization_id，值为sinitic
+ 一个视图中最多展现100个人物