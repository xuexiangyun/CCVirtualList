# CCVirtualList COCOS CREATOR虚拟列表
***
## 如何使用
1.将组件挂载到一个ui节点上

2.设置uitransfrom的大小，节点rect就代表列表渲染视窗大小

3.设置列表`是否是**虚拟列表**,**布局**，**边距，间距**，**滑动惯性**，**点击事件**，，**动画模式**`

4.将制作的预制体cell，拖入预制体列表中（支持不同预制体）

5.`public cellRenderer: (index: number, cell: any) => void `

` public cellProvider: (index: number) => number;`

`public cellResetRect: (rect: VRect, index: number) => void`
   
提供了三个函数他们可以被`this.list.itemRenderer = this.onRenderCell.bind(this)`，绑定到自己逻辑脚本中
这时你可以对列表numItems 设置数量，这样就渲染出来了
## MARK
1. 虚拟列表开启后不要关闭

2. 布局可能存在刷新错位的情况，请提交Issue or PR

3. 点击事件监听的是Button.EventType.CLICK，也就是你的cell必须有button组件

4. 定义的事件中可以自己按需监听

5. 动画模式可以自己扩展，非常简单

### ！！！ 只在web端运行过， 未经过各平台校验，请自行斟酌！！！
## TODO
[ ] 布局完善，减少计算量

[ ] 优化update中计算量

