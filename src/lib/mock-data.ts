/**
 * 演示模式用的 Mock 数据
 * 当 VITE_DEMO_MODE=true 时使用，无需配置任何后端服务
 */

export interface MockHotspot {
  title: string;
  heat: string;
  heat_numeric: number;
  platform: string;
  platforms: string[];
  resonance: boolean;
  event_core: string;
  fingerprint: string[];
  emotion_entry: string;
  relation_tension: string;
  emotion_nail: string;
  controversy_gap: string;
  directions: MockDirection[];
}

export interface MockDirection {
  hook: string;
  angle: string;
  tone: string;
  skeleton: string;
  synopsis: string;
  transform?: string;
}

export interface MockPoolItem {
  id: number;
  title: string;
  peak_heat: string;
  peak_heat_numeric: number;
  status: string;
  event_core: string;
}

// 模拟追踪池数据
export const mockPoolItems: MockPoolItem[] = [
  {
    id: 1,
    title: '鹅腿阿姨',
    peak_heat: '8200万',
    peak_heat_numeric: 82000000,
    status: 'active',
    event_core: '2023年11月清华北大高校区摆摊阿姨陈秀凤卖烤鹅腿走红，学生排队抢购争夺归属权霸屏热搜。2025年6月被曝实际卖鸭腿非鹅腿，引发挂鹅头卖鸭肉争议，网友戏称受骗群体平均学历最高的一次。',
  },
  {
    id: 2,
    title: '韩红走个面儿',
    peak_heat: '5600万',
    peak_heat_numeric: 56000000,
    status: 'active',
    event_core: '2026年6月冯小刚电影《抓特务》首映礼上，韩红作为配乐制作人上台用北京话喊话「走个面儿把第一波票房先带起来」。视频被剪出单独传播，被解读为道德绑架观众买票，引发舆论风暴。走个面儿是北京方言意为给个面子捧场，韩红随后公开道歉承认措辞不当。',
  },
  {
    id: 3,
    title: '清明节放假安排',
    peak_heat: '3400万',
    peak_heat_numeric: 34000000,
    status: 'cooling',
    event_core: '国务院办公厅发布清明节放假通知，4月4日至6日放假共3天，不调休。这是近年来首次清明假期不调休，引发网友热议和出行规划讨论。',
  },
];

// 模拟扫榜结果
export const mockScanResults: MockHotspot[] = [
  {
    title: '名校博士高校任教三年后辞职卖煎饼',
    heat: '1250万',
    heat_numeric: 12500000,
    platform: '微博',
    platforms: ['微博', '知乎'],
    resonance: true,
    event_core: '985高校一位任职三年的博士生讲师突然辞职，在学校门口摆摊卖煎饼。她在社交媒体发布「博士卖煎饼不丢人」的视频引发激烈讨论，评论区形成「学历贬值派」与「职业自由派」两大阵营。',
    fingerprint: ['学历贬值', '高校辞职', '煎饼创业', '职业选择'],
    emotion_entry: '读者想知道博士卖煎饼到底图什么',
    relation_tension: '博士身份 vs 摆摊职业的落差感',
    emotion_nail: '她在视频里平静地说「我给过学术机会了，它没给我活路」',
    controversy_gap: '支持者认为职业自由无贵贱，反对者认为浪费国家教育资源',
    directions: [
      {
        hook: '博士卖煎饼的第99天，她收到了前导师的一条微信',
        angle: '以与前导师的对话为切入点，揭开博士光环背后的真实困境',
        tone: '社会议题阶层冲突',
        skeleton: '阶层跃迁+逆袭打脸弧',
        synopsis: '曾经的学术新星在摆摊中找到了新的人生方向，当学术界再次向她招手时，她必须在「体面回归」和「真实自我」之间做出选择。',
      },
      {
        hook: '煎饼摊前排队的人里，有三个是她的博士同学',
        angle: '同学聚会在煎饼摊前意外重逢的戏剧性场景',
        tone: '都市悬疑惊悚',
        skeleton: '案中案+多层反转弧',
        synopsis: '看似普通的同学偶遇背后，隐藏着学术界的一桩秘密。当煎饼摊成为信息交换的暗站，她发现自己卷入了一场学术腐败的漩涡。',
      },
      {
        hook: '她用发CNS论文的严谨态度对待每一个煎饼',
        angle: '以学术精神做小生意的反差萌切入',
        tone: '甜宠追妻火葬场',
        skeleton: '暗恋成真+双向奔赴弧',
        synopsis: '一个执着的博士卖煎饼，一个每天必来的食客默默守护。当食客的真实身份曝光——原来是一直暗中支持她的同门师兄，两人的感情在烟火气中升温。',
      },
      {
        hook: '那个说「读书无用」的初中同学，现在是她摊位的房东',
        angle: '命运反转后的身份对调',
        tone: '家庭伦理复仇',
        skeleton: '压迫升级+反杀清算弧',
        synopsis: '曾经嘲笑她读书的同学如今成了小老板，而她却沦落为租客。但命运的齿轮早已转动，当老同学试图霸占她的摊位时，她亮出了真正的底牌。',
      },
    ],
  },
  {
    title: '女子分手后把前男友送的礼物全烧了',
    heat: '980万',
    heat_numeric: 9800000,
    platform: '抖音',
    platforms: ['抖音', '微博'],
    resonance: true,
    event_core: '一位女生在分手后直播焚烧前男友送的礼物，包括名牌包、首饰、情书等，全程面无表情。视频获得百万点赞，评论区引发关于「分手仪式感」和「情绪价值」的大讨论。',
    fingerprint: ['分手仪式感', '礼物焚烧', '情绪价值', '女性独立'],
    emotion_entry: '每个分手过的人都想知道烧东西是什么感觉',
    relation_tension: '过去的甜蜜回忆 vs 当下的决绝告别',
    emotion_nail: '烧到最后一封情书时，她的手停顿了三秒',
    controversy_gap: '有人认为这是勇敢释怀，有人认为是极端做作',
    directions: [
      {
        hook: '她烧掉第99件礼物时，发现了一张没见过的合照',
        angle: '在焚烧过程中意外发现的隐藏秘密',
        tone: '都市悬疑惊悚',
        skeleton: '密室困局+心理博弈弧',
        synopsis: '合照里的第三个人是她最信任的闺蜜。随着更多礼物被烧，一个关于背叛与谎言的真相逐渐浮出水面。',
      },
      {
        hook: '分手后我继承了前男友的「被害名单」',
        angle: '以为只是个普通前任，结果发现他得罪了一堆人',
        tone: '甜宠追妻火葬场',
        skeleton: '追妻火葬场+双向救赎弧',
        synopsis: '前男友突然找回来不是求复合，而是求救命。她被迫卷入一场荒诞的逃亡，却发现这个前任远没有那么简单。',
      },
      {
        hook: '那个烧掉的包里，有一张她不知道的孕检单',
        angle: '在遗物中发现改变一切的秘密',
        tone: '家庭伦理复仇',
        skeleton: '隐忍蓄力+真相大白弧',
        synopsis: '如果当时没有烧掉那个包，一切会不会不同？三年后她终于明白，有些真相被火焰吞噬，有些却永远烙在心里。',
      },
    ],
  },
  {
    title: '程序员35岁被裁后开网约车',
    heat: '760万',
    heat_numeric: 7600000,
    platform: '知乎',
    platforms: ['知乎'],
    resonance: false,
    event_core: '一位35岁的互联网大厂程序员被裁后开网约车，在知乎写下长文记录心路历程。文中提到「凌晨三点接到一个加班结束的产品经理，他没认出我就是被他优化掉的前同事」，引发互联网从业者共鸣。',
    fingerprint: ['35岁危机', '程序员被裁', '网约车', '互联网寒冬'],
    emotion_entry: '每个打工人都害怕自己的35岁',
    relation_tension: '前同事变成司机与乘客的身份错位',
    emotion_nail: '乘客下车时说「你们程序员赚够了就该干点正经事」',
    controversy_gap: '有人同情程序员的遭遇，有人认为这是市场优胜劣汰',
    directions: [
      {
        hook: '他接到的第35位乘客，是来裁他的人',
        angle: '网约车司机与前上司的密闭空间对话',
        tone: '都市悬疑惊悚',
        skeleton: '密室困局+心理博弈弧',
        synopsis: '后视镜里四目相对，车内气氛骤降冰点。这段20公里的行程，两个人各自藏着不可告人的秘密。',
      },
      {
        hook: '我在网约车后座发现了老板的犯罪证据',
        angle: '意外获得上司的机密文件后的人生转折',
        tone: '社会议题阶层冲突',
        skeleton: '公平抗争+热血成长弧',
        synopsis: '一个U盘改变了他的命运。当正义与生存产生冲突，这个被优化的程序员选择了最意想不到的反击方式。',
      },
    ],
  },
  {
    title: '回老家发现奶奶在偷偷写小说',
    heat: '650万',
    heat_numeric: 6500000,
    platform: '头条',
    platforms: ['头条', '抖音'],
    resonance: true,
    event_core: '一位年轻人春节回老家，意外发现78岁的奶奶在用一本发黄的稿纸写网络小说，题材竟是都市言情。奶奶透露自己写了三年，已经写到了第800章，但从未告诉过任何人。',
    fingerprint: ['奶奶作家', '隐藏爱好', '代际差异', '追梦'],
    emotion_entry: '每个人都有一段不为人知的过去',
    relation_tension: '奶奶的秘密爱好 vs 家人的不理解',
    emotion_nail: '奶奶说「你爷爷走了20年了，是小说里的他们一直陪着我」',
    controversy_gap: '有人认为这是浪漫，有人认为这是逃避现实',
    directions: [
      {
        hook: '奶奶小说里的男主，和我失踪多年的爷爷同名',
        angle: '小说内容与真实历史的诡异重合',
        tone: '奇幻志怪虐恋',
        skeleton: '宿命轮回+三世虐恋弧',
        synopsis: '奶奶笔下的故事越来越像真实发生的历史。当她翻到最后一章，发现爷爷留下的遗书就藏在稿纸之间。',
      },
      {
        hook: '78岁的奶奶成了网文大神，全家人追更',
        angle: '奶奶的秘密小说被全家人发现后的连锁反应',
        tone: '甜宠追妻火葬场',
        skeleton: '破镜重圆+误会解除弧',
        synopsis: '当奶奶的小说意外走红网络，失散多年的文学评论家爷爷突然现身。原来这些年他一直在默默守护着奶奶的文学梦。',
      },
    ],
  },
  {
    title: '地铁上被人让座拒绝了三次',
    heat: '520万',
    heat_numeric: 5200000,
    platform: '微博',
    platforms: ['微博'],
    resonance: false,
    event_core: '一位年轻女性在地铁上被老人让座，她因为自己其实怀孕而婉拒，但老人坚持。她把这段经历发上网，引发关于「让座美德」与「边界感」的讨论。评论区有人支持让座，有人认为年轻人也有不想被「道德绑架」的权利。',
    fingerprint: ['让座争议', '道德边界', '代际理解', '孕期尴尬'],
    emotion_entry: '每个人都经历过类似的尴尬瞬间',
    relation_tension: '好意的让座 vs 不想被特殊对待的自尊',
    emotion_nail: '老人说「我老伴当年怀孕的时候，连个让座的人都没有」',
    controversy_gap: '尊老 vs 女性不愿被标签化的矛盾',
    directions: [
      {
        hook: '那位让座的老先生，是她素未谋面的外公',
        angle: '血脉相连却不识的巧合',
        tone: '家庭伦理复仇',
        skeleton: '身份错位+伦理崩塌弧',
        synopsis: '一次DNA检测揭开了一个隐藏了28年的身世之谜。当她知道让座老人就是当年抛弃她母亲的外公时，那份沉甸甸的亲情该何去何从。',
      },
    ],
  },
];

// 模拟词表数据
export const mockVocab = {
  tones: [
    '家庭伦理复仇',
    '都市悬疑惊悚',
    '甜宠追妻火葬场',
    '奇幻志怪虐恋',
    '民俗恐怖复仇',
    '穿书女配逆袭',
    '贴身视角短句驱动',
    '社会议题阶层冲突',
  ],
  arcs: [
    '压迫升级+反杀清算弧',
    '隐忍蓄力+真相大白弧',
    '案中案+多层反转弧',
    '密室困局+心理博弈弧',
    '追妻火葬场+双向救赎弧',
    '暗恋成真+双向奔赴弧',
    '宿命轮回+三世虐恋弧',
    '逆天改命+打脸虐渣弧',
    '阶层跃迁+逆袭打脸弧',
    '公平抗争+热血成长弧',
  ],
  strongPairs: [
    { tone: '家庭伦理复仇', skeleton: '压迫升级+反杀清算弧', strength: 'strong' },
    { tone: '都市悬疑惊悚', skeleton: '案中案+多层反转弧', strength: 'strong' },
    { tone: '甜宠追妻火葬场', skeleton: '追妻火葬场+双向救赎弧', strength: 'strong' },
    { tone: '奇幻志怪虐恋', skeleton: '宿命轮回+三世虐恋弧', strength: 'strong' },
    { tone: '穿书女配逆袭', skeleton: '逆天改命+打脸虐渣弧', strength: 'strong' },
    { tone: '社会议题阶层冲突', skeleton: '阶层跃迁+逆袭打脸弧', strength: 'strong' },
  ],
  allPairs: [],
};
