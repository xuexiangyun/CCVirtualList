import { Event, animation } from 'cc';
import { Widget } from 'cc';
import { UIOpacity } from 'cc';
import { CCFloat } from 'cc';
import { Button } from 'cc';
import { _decorator, Component, Enum, EventTouch, instantiate, Mask, Node, NodePool, Prefab, rect, Rect, Size, Tween, tween, UITransform, v2, Vec2, Vec3, CCInteger } from 'cc';
const { ccclass, property, disallowMultiple, menu } = _decorator;

const v2_1 = v2();
const v2_2 = v2();
const v2_3 = v2();
const v2_4 = v2();
const v2_5 = v2();
const v2_6 = v2();
const DrawRect = rect();

// 布局类型
export enum ListLayoutType
{
    /** 垂直列表布局(水平居中、垂直滑动) */
    ListVertical,
    /** 水平列表布局(垂直居中、水平滑动) */
    ListHorizontal,
    /** 水平流动布局 */
    FlowHorizontal,
    /** 垂直流动布局 */
    FlowVertical,
    /** 自定义布局 */
    Custom
}

// 对齐方式
export enum HorAlignType
{
    LEFT,
    RIGHT,
    CENTER
}

export enum VertAlignType
{
    TOP
}

// 滚动位置类型
export enum ScrollPositionType
{
    Start = 0,
    Center,
    End
}

// 溢出处理
export enum OverflowType
{
    VISIBLE,
    SCROLL
}

// 选择模式 
export enum SelectedType
{
    NONE = 0,
    /** 单选 */
    SINGLE = 1,
}

// 列表配置
const ListConfig = {
    inertiaTime: 1
};

// 列表项动画类型
export enum ListAnimType
{
    /**无动画 */
    NONE,
    /**透明度变化*/
    ALPHA,
    /** 缩放 */
    SCALE,
}

// 矩形扩展
export class VRect extends Rect
{
    cellIndex = 0;
    offsetX = 0;
    offsetY = 0;
    priority = 0;
}

@ccclass('CCVirtualList')
@disallowMultiple()
@menu('UI/CCVirtualList')
export class CCVirtualList extends Component
{
    //#region 事件
    static LIST_CELL_CLICK_EVT: string = "list_cell_click_evt" // 列表项点击事件
    static LIST_SCROLL_END_EVT: string = "list_scroll_end_evt" // 滚动结束事件
    static LIST_TOUCH_MOVE_BOTTOM_EVT: string = "list_touch_move_bottom_evt" // 触摸移动到底部事件
    static LIST_TOUCH_MOVE_TOP_EVT: string = "list_touch_move_top_evt" // 触摸移动到顶部事件
    static LIST_ANIM_END: "list_anim_end"  // 动画结束事件
    //#endregion

    @property({ displayName: "虚拟列表" })
    protected isVirtual = false

    // 布局属性
    @property({ type: Enum(ListLayoutType), displayName: "布局类型" })
    protected layoutType = ListLayoutType.ListVertical;

    @property({
        type: CCInteger,
        displayName: "上边距",
        visible: (function (this: any) { return this.layoutType !== ListLayoutType.Custom })
    })
    protected paddingTop = 0;

    @property({
        type: CCInteger,
        displayName: "下边距",
        visible: (function (this: any) { return this.layoutType !== ListLayoutType.Custom })
    })
    protected paddingBottom = 0;

    @property({
        type: CCInteger,
        displayName: "左边距",
        visible: (function (this: any) { return this.layoutType !== ListLayoutType.Custom })
    })
    protected paddingLeft = 0;

    @property({
        type: CCInteger,
        displayName: "右边距",
        visible: (function (this: any) { return this.layoutType !== ListLayoutType.Custom })
    })
    protected paddingRight = 0;

    @property({
        type: CCInteger,
        displayName: "水平间距",
        tooltip: "水平方向上的间距",
        visible: (function (this: any)
        {
            return this.layoutType !== ListLayoutType.Custom &&
                this.layoutType !== ListLayoutType.ListVertical
        })
    })
    protected spacingX = 0;

    @property({
        type: CCInteger,
        displayName: "垂直间距",
        tooltip: "垂直方向上的间距",
        visible: (function (this: any)
        {
            return this.layoutType !== ListLayoutType.Custom &&
                this.layoutType !== ListLayoutType.ListHorizontal
        })
    })
    protected spacingY = 0;

    @property({
        type: Enum(HorAlignType),
        displayName: "水平对齐方式",
        tooltip: "水平方向的对齐方式",
        visible: (function (this: any)
        {
            return this.layoutType === ListLayoutType.FlowHorizontal ||
                this.layoutType === ListLayoutType.FlowVertical
        })
    })
    protected horAlignType = HorAlignType.LEFT;

    @property({ displayName: "滑动惯性", tooltip: "是否启用滑动惯性效果" })
    protected inertia = true;

    @property({ type: Enum(OverflowType), displayName: "显示类型" })
    protected overflowType = OverflowType.SCROLL;

    @property({ type: Enum(SelectedType), displayName: "选择模式类型", tooltip: "click需要需要预制体是button组件" })
    protected selectedType: SelectedType = SelectedType.NONE

    @property({ type: Enum(ListAnimType), displayName: "动画类型" })
    protected animationType: ListAnimType = ListAnimType.NONE;

    @property({ type: CCFloat, displayName: "Cell动画持续时间", visible: (function (this: any) { return this.animationType !== ListAnimType.NONE }) })
    protected _cellAnimTime: number = 0.3;

    @property({ type: [Prefab], displayName: "预制体列表" })
    protected cellPrefabs: Prefab[] = [];

    inertiaTime = ListConfig.inertiaTime;
    private _container: Node;
    private _pools: NodePool[] = [];
    private _numItems = 0;
    private _rects: VRect[] = [];
    private _map = new Map<VRect, Node>();
    private _map2 = new Map<Node, VRect>();
    private _scrollOffset = new Vec2();
    private _scrollMaxOffset = new Vec2();
    private _contentSize = new Size();
    private _isTouching = false;
    private _isScrolling = false;
    private _movingInertia = v2();
    private _autoMoveTween: Tween<any> | null;
    private _drawRect = new Rect();
    private _containerOffset = new Vec3();
    private _cloneNode: Node;
    private _showAnim: boolean = false
    private _isPlayed: boolean = false;
    /** 
    * cell渲染器 设置数量前必须设置此回调
    * @param index 数据的索引
    * @param cell 对应的cell对象
    * @tips 调用次数不可靠可能会很高 不要在此函数做复杂计算
    */
    public cellRenderer: (index: number, cell: any) => void

    /**
     * 获取index对应cell的prefab
     * @param index 数据的索引
     * @returns cellPrefabs中对应的cell索引
     * @tips 调用次数不可靠可能会很高 不要在此函数做复杂计算
     */
    public cellProvider: (index: number) => number;


    /**
    * 重置rect大小
    * @param rect 对应的rect
    * @param index 数据的索引
    * @tips 调用次数不可靠可能会很高 不要在此函数做复杂计算
    */
    public cellResetRect: (rect: VRect, index: number) => void


    /**
     * 设置列表长度
     */
    set numItems(value: number)
    {
        if (this.cellPrefabs.length == 0)
        {
            throw console.error("Set cellPrefabs first!");
        }

        if (value == null || value < 0)
        {
            throw console.error('numItems error::', value);
        }

        if (this.cellRenderer == null)
        {
            throw console.error("Set cellRenderer first!");
        }
        this._showAnim = this.animationType !== ListAnimType.NONE;
        this._numItems = value;
        this._resetLayout();
        if (!this.isVirtual)
        {
            this._addAllCell()
            this.playAnimation()
        }
    }

    /**
     * 获取内容尺寸
     */
    get contentSize()
    {
        return this._contentSize;
    }

    /**
     * 当前滚动的偏移量
     */
    get scrollOffset()
    {
        return this._scrollOffset;
    }

    /**
     * 最大可滚动的偏移量
     */
    get scrollMaxOffset()
    {
        return this._scrollMaxOffset;
    }

    /**
     * 是否手势滚动中
     */
    get isTouching()
    {
        return this._isTouching;
    }

    /**
    * 获取cell的下标, 找不到返回-1
    * @param cell 
    */
    getCellIndex(cell: Node): number | -1
    {
        return this._map2.get(cell)?.cellIndex ?? -1;
    }

    /**
     * 获取cell
     * @param index 数据的索引
     * @returns 对应的cell 虚拟列表时可能返回null
     */
    getCell(index: number): Node | null
    {
        return this._map.get(this._rects[index]) ?? null;
    }

    /**
     * 添加项目
     * @deprecated 请使用numItems函数
     * @param index itemPrefab的索引
     * @method 虚拟列表时候不能使用此函数直接设置numItems
     */
    addCellFromPool(index: number = 0): Node | null
    {
        if (this.isVirtual)
        {
            console.error("Cannot add cell directly when isVirtual is true");
            return null;
        }

        if (index < 0 || index >= this.cellPrefabs.length)
        {
            console.error("Invalid prefab index:", index);
            return null;
        }

        const node = this._getNode(this._numItems);
        const rect = new VRect();
        const { width, height } = ((this._cloneNode as any)._getUITransformComp() as any).contentSize;

        rect.width = width;
        rect.height = height;
        rect.cellIndex = this._numItems;

        switch (this.layoutType)
        {
            case ListLayoutType.ListVertical:
                rect.x = (this._drawRect.width - width) / 2;
                rect.y = this._contentSize.height;
                break;
            case ListLayoutType.ListHorizontal:
                rect.x = this._contentSize.width;
                rect.y = (this._drawRect.height - height) / 2;
                break;
            default:
                console.warn("addCellFromPool may not work properly with current layout type");
                rect.x = 0;
                rect.y = 0;
        }

        this._rects.push(rect);
        this._numItems++;
        this._contentSize.height += height + this.spacingY;
        this._contentSize.width += width + this.spacingX;

        node.setPosition(rect.x + rect.width / 2, -rect.y - rect.height / 2, 0);
        const uiTransform = node.getComponent(UITransform)!;
        uiTransform.setContentSize(rect.width, rect.height);

        this._map.set(rect, node);
        this._map2.set(node, rect);

        return node;
    }

    /**
     * 移除项目
     * @deprecated 请使用numItems函数
     * @param index 数据的索引,如果没有index则删除所有
     */
    removeCellToPool(index?: number)
    {
        if (this.isVirtual)
        {
            console.error("Cannot remove cell directly when isVirtual is true");
            return;
        }

        if (index !== undefined)
        {
            if (index < 0 || index >= this._rects.length)
            {
                console.error("Invalid cell index:", index);
                return;
            }

            const rect = this._rects[index];
            const node = this._map.get(rect);
            if (node)
            {
                this._putNode(index, node);
                this._map.delete(rect);
                this._map2.delete(node);
            }
            this._rects.splice(index, 1);
            this._numItems--;

            this._resetLayout();
        } else
        {
            this._clearAllCell();
            this._numItems = 0;
            this._contentSize.set(0, 0);
            ((this._container as any)._getUITransformComp() as any).setContentSize(0, 0);
        }
    }


    /**
     * 刷新指定的cell 如果不指定则刷新所有的cell
     * @param cellIndex 数据的索引
     */
    refreshCell(cellIndex?: number)
    {
        if (cellIndex !== undefined)
        {
            const rect = this._rects[cellIndex];
            const node = rect && this._map.get(rect);
            node && this.cellRenderer?.(cellIndex, node);
            return;
        }

        for (const [rect, node] of this._map)
        {
            this.cellRenderer?.(rect.cellIndex, node);
        }
    }

    //#region 初始化
    onLoad()
    {
        this._initMask();
        this._initPools();
        this._initContainer();
    }

    private _initMask()
    {
        if (this.overflowType !== OverflowType.VISIBLE)
        {
            this.node.addComponent(Mask);
        }
    }

    private _initPools()
    {
        if (this.cellPrefabs.length == 0)
        {
            throw console.error("Set cellPrefabs first!");
        }

        for (let _ of this.cellPrefabs)
        {
            this._pools.push(new NodePool());
        }

        this._cloneNode = this._getNode(0)
        this._cloneNode.parent = null;
    }

    private _initContainer()
    {
        this._container = new Node("container");
        this._container.parent = this.node;
        this._container.addComponent(UITransform).setAnchorPoint(0, 1);

        let widget = this.node.getComponent(Widget);
        if (widget)
        {
            widget.updateAlignment();
        }
        this._onSizeChanged();
        this.node.on(Node.EventType.SIZE_CHANGED, this._onSizeChanged, this);
    }

    private _onSizeChanged()
    {
        const contentSize = this.node.getComponent(UITransform)!.contentSize;
        this._container.setPosition(-contentSize.width / 2, contentSize.height / 2, 0);
        this._containerOffset.set(this._container.position);
        this._drawRect.set(0, 0, contentSize.width, contentSize.height);
    }
    //#endregion

    //#region 触控相关

    private _cancelTouchEvent()
    {
        this._isTouching = false;
        this._isScrolling = false;
        this._clearAutoMoveTween();
        this._clearMovingInertia();
    }

    private _onTouchStart(event: EventTouch)
    {

        this._isTouching = true;
        this._isScrolling = false;
        this._clearAutoMoveTween();
        this._clearMovingInertia();
        this._stopPropagationIfTargetIsMe(event);
    }

    private _onTouchMove(event: EventTouch)
    {

        if (!this._isTouching)
        {
            return;
        }
        let delta = event.getUIDelta(v2_1);
        if (!this._isScrolling)
        {
            let start = event.getUIStartLocation(v2_5);
            let current = event.getUILocation(v2_6);
            let distance = Vec2.distance(start, current);
            if (distance > 7)
            {
                if (!this._isScrolling && event.target !== this.node)
                {
                    const cancelEvent = new EventTouch(event.getTouches(), event.bubbles, Node.EventType.TOUCH_CANCEL);
                    cancelEvent.touch = event.touch;
                    cancelEvent.simulate = true;
                    (event.target as Node).dispatchEvent(cancelEvent);
                    this._isScrolling = true;
                }
            }
            this._stopPropagationIfTargetIsMe(event);
            return;
        }
        this.unschedule(this._clearMovingInertia);
        Vec2.copy(v2_2, this._scrollOffset);
        this._addOffset(delta.x, delta.y);
        Vec2.copy(this._movingInertia, this._scrollOffset).subtract(v2_2);
        this.scheduleOnce(this._clearMovingInertia, 0.1);

        this._stopPropagationIfTargetIsMe(event);
    }

    private _onTouchEnd(event: EventTouch)
    {

        if (!this._isTouching)
        {
            return;
        }
        if (!this._isScrolling)
        {
            return;
        }
        this.unschedule(this._clearMovingInertia);
        this._isTouching = false;

        if (this.inertia && (this._movingInertia.x !== 0 || this._movingInertia.y !== 0))
        {
            let tweenObj = { t: 1 };
            this._autoMoveTween = tween(tweenObj).to(this.inertiaTime, { t: 0 }, {
                easing: 'linear',
                onUpdate: () =>
                {
                    v2_3.set(this._movingInertia).multiplyScalar(tweenObj.t);
                    this._addOffset(-v2_3.x, v2_3.y);
                }
            }).call(() =>
            {
                this._movingInertia.set(0, 0);
                this._autoMoveTween = null;
            }).start();
        }

        if (this._scrollOffset.y == 0)
        {
            this.node.emit(CCVirtualList.LIST_TOUCH_MOVE_TOP_EVT);
        } else if (this._scrollOffset.y == this._scrollMaxOffset.y)
        {
            this.node.emit(CCVirtualList.LIST_TOUCH_MOVE_BOTTOM_EVT);
        }

        if (this._isScrolling)
        {
            event.propagationStopped = true;
        } else
        {
            this._stopPropagationIfTargetIsMe(event);
        }
    }

    protected _stopPropagationIfTargetIsMe(event: Event)
    {
        if (event.eventPhase === Event.AT_TARGET && event.target === this.node)
        {
            event.propagationStopped = true;
        }
    }

    onEnable()
    {
        this.node.on(Node.EventType.SIZE_CHANGED, this._onSizeChanged, this, true);
        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this, true);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this, true);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this, true);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this, true);
        this._isPlayed = false;
    }

    onDisable()
    {
        this.node.off(Node.EventType.SIZE_CHANGED, this._onSizeChanged, this);
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    onDestroy(): void
    {
        this._autoMoveTween?.stop()
    }
    //#endregion

    //#region  渲染相关

    private _resetLayout()
    {
        this._clearAllCell();

        switch (this.layoutType)
        {
            case ListLayoutType.ListVertical:
                this._layoutForListVertical();
                break;
            case ListLayoutType.ListHorizontal:
                this._layoutForListHorizontal();
                break;
            case ListLayoutType.FlowVertical:
                this._layoutForGridVertical();
                break;
            case ListLayoutType.FlowHorizontal:
                this._layoutForGridHorizontal();
                break;
            case ListLayoutType.Custom:
                this.layoutForCustom();
                break;
        }
    }

    private _addAllCell()
    {
        for (let i = 0; i < this._numItems; i++)
        {
            const rect = this._rects[i];
            const node = this._getNode(i);
            node.setPosition(rect.x + rect.width / 2, -rect.y - rect.height / 2, 0);
            const uiTransform = node.getComponent(UITransform)!;
            uiTransform.setContentSize(rect.width, rect.height);
            if (rect.priority !== 0)
            {
                uiTransform.priority = rect.priority;
            }
            this._map.set(rect, node);
            this._map2.set(node, rect);
            this.cellRenderer?.(i, node);
        }
    }

    private _clearAllCell()
    {
        for (const [rect, node] of this._map)
        {
            this._putNode(rect.cellIndex, node);
        }
        this._map.clear();
        this._map2.clear();
        this._rects = [];
    }

    update(dt: number)
    {
        this._container.setPosition(this._containerOffset.x - this._scrollOffset.x, this._containerOffset.y + this._scrollOffset.y, this._containerOffset.z);
        this._drawRect.x = this._scrollOffset.x;
        this._drawRect.y = this._scrollOffset.y;
        if (this.isVirtual)
        {
            let keys = Array.from(this._map.keys());

            DrawRect.set(this._drawRect);

            for (const rect of keys)
            {
                if (!DrawRect.intersects(rect))
                {
                    let node = this._map.get(rect)!;
                    this._map.delete(rect);
                    this._map2.delete(node);
                    this._putNode(rect.cellIndex, node);
                }
            }

            for (let rect of this._rects)
            {
                if (DrawRect.intersects(rect))
                {
                    if (!this._map.has(rect))
                    {
                        let node = this._getNode(rect.cellIndex);
                        node.setPosition(rect.x + rect.width / 2, -rect.y - rect.height / 2, 0);
                        ((node as any)._getUITransformComp() as any).setContentSize(rect.width, rect.height);
                        if (rect.priority !== 0)
                        {
                            ((node as any)._getUITransformComp() as any).priority = rect.priority;
                        }
                        this._map.set(rect, node);
                        this._map2.set(node, rect);

                        let index = rect.cellIndex;
                        this.cellRenderer && this.cellRenderer(index, node);
                    }
                }
            }

            if (this._showAnim && this._numItems > 0 && !this._isPlayed)
            {
                this.playAnimation()
            }
        }

    }

    private _getNode(index: number): Node
    {
        const prefabIndex = this.cellProvider ? this.cellProvider(index) : 0;
        const pool = this._pools[prefabIndex];

        let node = pool.size() > 0 ? pool.get()! : instantiate(this.cellPrefabs[prefabIndex]);
        if (this.selectedType == SelectedType.SINGLE && !node.hasEventListener(Button.EventType.CLICK, this._onSelectCell))
        {
            node.on(Button.EventType.CLICK, this._onSelectCell, this)
        }
        node.parent = this._container;
        node.active = true;
        return node;
    }

    private _putNode(index: number, node: Node)
    {
        node.active = false;
        let prefabIndex = this.cellProvider ? this.cellProvider(index) : 0
        this._pools[prefabIndex].put(node);
    }

    private _onSelectCell(btn: Button)
    {
        let index = this._map2.get(btn.node)
        if (!index) return
        this.node.emit(CCVirtualList.LIST_CELL_CLICK_EVT, index.cellIndex, btn)
    }

    private _addOffset(x: number, y: number)
    {
        const offset = this._scrollOffset;
        offset.add2f(-x, y);
        offset.clampf(Vec2.ZERO, this._scrollMaxOffset);
    }
    //#endregion

    //#region  滚动相关

    private _clearAutoMoveTween()
    {
        if (this._autoMoveTween)
        {
            this._autoMoveTween.stop();
            this._autoMoveTween = null;
        }
    }

    private _clearMovingInertia()
    {
        this._movingInertia.set(0, 0);
    }

    /**
     * 滚动到顶部
     * @param duration 默认动画时间1s，如果是null则禁止动画
     */
    scrollToTop(duration = 1)
    {
        this.scrollTo(Vec2.ZERO, duration);
    }

    /**
     * 滚动到底部
     * @param duration 默认动画时间1s，如果是null则禁止动画
     */
    scrollToBottom(duration = 1)
    {
        this.scrollTo(this._scrollMaxOffset, duration);
    }

    /**
     * 滚动到指定下标
     * @param index 
     * @param type 滚动的位置类型
     * @param duration 默认动画时间1s，如果是null则禁止动画
     */
    scrollToIndex(index: number, type = ScrollPositionType.Center, duration = 1)
    {
        let rect = this._rects[index];
        if (!rect) return;
        let offset = v2();
        if (type === ScrollPositionType.Start)
        {
            offset.set(rect.x, rect.y);
            offset.subtract2f(this.spacingX / 2, this.spacingY / 2);
        }
        else if (type === ScrollPositionType.Center)
        {
            offset.set(rect.x - (this._drawRect.width - rect.width) / 2, rect.y - (this._drawRect.height - rect.height) / 2);
        }
        else if (type === ScrollPositionType.End)
        {
            offset.set(rect.x - (this._drawRect.width - rect.width), rect.y - (this._drawRect.height - rect.height));
            offset.add2f(this.spacingX / 2, this.spacingY / 2);
        }
        this.scrollTo(offset, duration);
    }

    /**
     * 滚动到指定位置
     * @param offset 
     * @param duration 默认动画时间1s，如果是null则禁止动画
     */
    scrollTo(offset: Vec2, duration = 1)
    {
        this._cancelTouchEvent();

        let endOffset = offset.clone();
        endOffset.clampf(Vec2.ZERO, this._scrollMaxOffset);

        if (duration === null)
        {
            this.scrollOffset.set(endOffset);
            return;
        }
        let startOffset = this.scrollOffset.clone();
        let tweenObj = { t: 0 };
        this._autoMoveTween = tween(tweenObj).to(duration, { t: 1 }, {
            easing: 'linear',
            onUpdate: () =>
            {
                Vec2.lerp(v2_4, startOffset, endOffset, tweenObj.t);
                this.scrollOffset.set(v2_4);
            }
        }).call(() =>
        {
            this._movingInertia.set(0, 0);
            this._autoMoveTween = null;
            this.node.emit(CCVirtualList.LIST_SCROLL_END_EVT);
        }).start();
    }
    //#endregion

    //#region 布局相关

    private _layoutForListVertical()
    {
        let yOffset = this.paddingTop;
        let { width, height } = ((this._cloneNode as any)._getUITransformComp() as any).contentSize;
        for (let i = 0; i < this._numItems; i++)
        {
            let rect = new VRect();
            rect.width = width;
            rect.height = height;
            this.cellResetRect && this.cellResetRect(rect, i);
            rect.cellIndex = i;
            let xOffset = (this._drawRect.width - rect.width) / 2;
            rect.x = xOffset + rect.offsetX;
            rect.y = yOffset + rect.offsetY;
            this._rects.push(rect);

            yOffset = rect.y + rect.height + this.spacingY;
        }
        let maxY = 0;
        if (this._rects.length > 0)
        {
            let lastRect = this._rects[this._rects.length - 1];
            maxY = lastRect.y + lastRect.height;
        }
        this._contentSize.set(this._drawRect.width, maxY + this.paddingBottom);
        ((this._container as any)._getUITransformComp() as any).setContentSize(this._contentSize.width, this._contentSize.height);
        this._scrollMaxOffset.x = 0;
        this._scrollMaxOffset.y = Math.max(0, this._contentSize.height - this._drawRect.height);
    }

    private _layoutForListHorizontal()
    {
        let xOffset = this.paddingLeft;
        let { width, height } = ((this._cloneNode as any)._getUITransformComp() as any).contentSize;
        for (let i = 0; i < this._numItems; i++)
        {
            let rect = new VRect();
            rect.width = width;
            rect.height = height;
            this.cellResetRect && this.cellResetRect(rect, i);
            rect.cellIndex = i;
            let yOffset = (this._drawRect.height - rect.height) / 2;
            rect.x = xOffset + rect.offsetX;
            rect.y = yOffset + rect.offsetY;
            this._rects.push(rect);

            xOffset = rect.x + rect.width + this.spacingX;
        }
        let maxX = 0;
        if (this._rects.length > 0)
        {
            let lastRect = this._rects[this._rects.length - 1];
            maxX = lastRect.x + lastRect.width;
        }
        this._contentSize.set(maxX + this.paddingRight, this._drawRect.height);
        ((this._container as any)._getUITransformComp() as any).setContentSize(this._contentSize.width, this._contentSize.height);
        this._scrollMaxOffset.x = Math.max(0, this._contentSize.width - this._drawRect.width);
        this._scrollMaxOffset.y = 0;
    }

    private _layoutForGridHorizontal()
    {
        let xOffset = this.paddingLeft;
        let yOffset = this.paddingTop;
        let { width, height } = ((this._cloneNode as any)._getUITransformComp() as any).contentSize;

        let currentRowRects: VRect[] = [];
        let currentRowWidth = 0;

        for (let i = 0; i < this._numItems; i++)
        {
            let rect = new VRect();
            rect.width = width;
            rect.height = height;
            this.cellResetRect && this.cellResetRect(rect, i);
            rect.cellIndex = i;
            rect.x += rect.offsetX;
            rect.y += rect.offsetY;

            if (xOffset !== this.paddingLeft && xOffset + rect.width > this._drawRect.width)
            {

                currentRowWidth -= this.spacingX;

                const rowOffsetX = (this._drawRect.width - currentRowWidth) / 2;
                for (const rowRect of currentRowRects)
                {
                    rowRect.x = rowOffsetX + rowRect.x - this.paddingLeft;
                }

                // 换行
                yOffset += rect.height + this.spacingY;
                xOffset = this.paddingLeft;
                currentRowRects = [];
                currentRowWidth = 0;
            }

            rect.x = xOffset;
            rect.y = yOffset;
            this._rects.push(rect);
            currentRowRects.push(rect);

            xOffset += rect.width + this.spacingX;
            currentRowWidth += rect.width + this.spacingX;
        }

        if (currentRowRects.length > 0)
        {
            currentRowWidth -= this.spacingX;
            const rowOffsetX = (this._drawRect.width - currentRowWidth) / 2;
            for (const rowRect of currentRowRects)
            {
                rowRect.x = rowOffsetX + rowRect.x - this.paddingLeft;
            }
        }

        let maxY = 0;
        if (this._rects.length > 0)
        {
            let lastRect = this._rects[this._rects.length - 1];
            maxY = lastRect.y + lastRect.height;
        }
        this._contentSize.set(this._drawRect.width, maxY + this.paddingBottom);
        ((this._container as any)._getUITransformComp() as any).setContentSize(this._contentSize.width, this._contentSize.height);
        this._scrollMaxOffset.x = 0;
        this._scrollMaxOffset.y = Math.max(0, this._contentSize.height - this._drawRect.height);
    }

    private _layoutForGridVertical()
    {
        let xOffset = this.paddingLeft;
        let yOffset = this.paddingTop;
        let { width, height } = ((this._cloneNode as any)._getUITransformComp() as any).contentSize;
        for (let i = 0; i < this._numItems; i++)
        {
            let rect = new VRect();
            rect.width = width;
            rect.height = height;
            this.cellResetRect && this.cellResetRect(rect, i);
            rect.cellIndex = i;
            rect.x += rect.offsetX;
            rect.y += rect.offsetY;

            if (yOffset !== this.paddingTop && yOffset + rect.height > this._drawRect.height)
            {
                xOffset += rect.width + this.spacingX;
                yOffset = this.paddingTop;
            }

            rect.x = xOffset;
            rect.y = yOffset;

            this._rects.push(rect);

            yOffset += rect.height + this.spacingY;
        }
        let maxX = 0;
        if (this._rects.length > 0)
        {
            let lastRect = this._rects[this._rects.length - 1];
            maxX = lastRect.x + lastRect.width;
        }
        this._contentSize.set(maxX + this.paddingRight, this._drawRect.height);
        ((this._container as any)._getUITransformComp() as any).setContentSize(this._contentSize.width, this._contentSize.height);
        this._scrollMaxOffset.x = Math.max(0, this._contentSize.width - this._drawRect.width);
        this._scrollMaxOffset.y = 0;
    }

    private layoutForCustom(): void { }
    //#endregion

    //#region  动画相关

    /**
     * 播放动画
     */
    protected playAnimation()
    {
        if (this._isPlayed) return;
        if (!this._showAnim) return
        this._showAnim = false
        switch (this.animationType)
        {
            case ListAnimType.ALPHA:
                this.playAlphaAnimation()
                break;
            case ListAnimType.SCALE:
                this.palyScaleAnimation()
                break;
        }
    }

    protected playAlphaAnimation()
    {
        let i = 0
        const total = this._map2.size
        for (let [nd, _] of this._map2)
        {
            let op = nd.getComponent(UIOpacity)
            if (!op) op = nd.addComponent(UIOpacity)
            op.opacity = 0
            i++
            (nd as any)["_animIndex"] = i
            tween(op).delay(i * 0.05).to(this._cellAnimTime, { opacity: 255 })
                .call(() =>
                {
                    if ((nd as any)["_animIndex"] == total)
                    {
                        this.node.emit(CCVirtualList.LIST_ANIM_END)
                    }
                }).start()
        }
    }

    protected palyScaleAnimation()
    {
        let i = 0
        const total = this._map2.size
        for (let [nd, _] of this._map2)
        {
            nd.setScale(0, 0)
            i++
            (nd as any)["_animIndex"] = i
            tween(nd).delay(i * 0.05).to(this._cellAnimTime, { scale: Vec3.ONE })
                .call(() =>
                {
                    if ((nd as any)["_animIndex"] == total)
                    {
                        this.node.emit(CCVirtualList.LIST_ANIM_END)
                    }
                }).start()
        }
    }
    //#endregion

}
