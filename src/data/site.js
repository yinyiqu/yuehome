/**
 * 站点与卡片的全部内容都在这个文件里。
 * 改文案、换名字、加一张牌，都不需要动组件。
 *
 * 一张牌支持这些字段：
 *   id      必填，唯一，用来做动画的 key
 *   name    必填，卡片正面的大字
 *   en      英文名，显示在名字下面的小字里
 *   tag     分类，一个词，例如「工具」
 *   desc    一句话介绍，鼠标悬停时也可以看到
 *   url     点击跳转的地址；留空则视为示例卡，点击只提示
 *   emoji   图标；也可以用 icon: '/icons/xxx.png' 换成图片
 *   hue     这张牌的主色相 0–360，不写则按顺序自动分配
 */

export const site = {
  name: '𝓫𝓮𝓲𝔂𝓾𝓮',
  sub: 'home',
  title: 'Beiyue home',
  hint: '上下滑动翻牌 · 点开就用',
  author: 'Beiyue',
  since: 2026,
  github: '',
  email: '',
  footerNote: '用 Vue 3 + Vite 手写的一叠牌'
}

/** 12 个主色相轮转：新增卡片自动取色，不需要手动配 */
const HUES = [32, 202, 344, 164, 268, 12, 190, 96, 222, 316, 48, 148]

/**
 * 卡片清单：顺序就是牌堆里从上到下的顺序，最后一张会整张露出。
 * hue 不写就按 HUES 顺序自动分配。
 */
const SAMPLES = [
  {
    id: 'danmaku',
    name: '弹幕',
    en: 'Danmaku',
    tag: '趣味',
    desc: '打开就能发，屏幕上飘过的都是别人的碎碎念。',
    url: 'https://yue.dpdns.org',
    emoji: '🎬',
    hue: 205
  },
  {
    id: 'gameboy',
    name: 'GameBoy',
    en: 'Game Boy Live',
    tag: '游戏',
    desc: '拖一张卡带进去，就能在浏览器里玩 GB / GBC / GBA。',
    url: `${import.meta.env.BASE_URL}GameBoyLive/`,
    emoji: '🕹️',
    /* 用模拟器自己的图标，和参考站一致 */
    icon: `${import.meta.env.BASE_URL}icons/gameboy.svg`,
    hue: 172
  },
  {
    id: 'jianguoyun',
    name: '坚果云',
    en: 'Nutstore',
    tag: '工具',
    desc: '跨设备同步文件，改完自动上传。',
    url: 'https://www.jianguoyun.com',
    emoji: '☁️',
    hue: 38
  },
  {
    id: 'dnshe',
    name: 'DNSHE 域名',
    en: 'DNSHE',
    tag: '工具',
    desc: '解析、转发、记录，一处管好域名。',
    url: 'https://my.dnshe.com/clientarea.php?language=chinese',
    emoji: '🌐',
    hue: 262
  },
  {
    id: 'vcd-mail',
    name: 'V.CD 邮箱',
    en: 'V.CD Mail',
    tag: '工具',
    desc: '挂在 v.cd 域名上的一个邮箱。',
    url: 'https://mail.v.cd',
    emoji: '✉️',
    hue: 320
  },
  {
    id: 'iloveimg',
    name: '图片编辑',
    en: 'iLoveIMG',
    tag: '工具',
    desc: '裁剪、压缩、转格式，全在浏览器里完成。',
    url: 'https://www.iloveimg.com/zh-cn',
    emoji: '🖼️',
    hue: 8
  },
  {
    id: 'fontchanger',
    name: '字体转换',
    en: 'Font Changer',
    tag: '工具',
    desc: '把字换成各种花体、符号体，复制就能用。',
    url: 'https://www.iamwawa.cn/fontchanger.html',
    emoji: 'Aa',
    hue: 100
  },
  {
    id: 'md5',
    name: 'MD5 修改',
    en: 'MD5 Editor',
    tag: '工具',
    desc: '末尾添几个字节，文件指纹就换了一个，支持批量。',
    url: `${import.meta.env.BASE_URL}md5/`,
    hue: 190
  }
]

export const apps = SAMPLES.map((app, i) => ({
  ...app,
  url: app.url || '',
  hue: app.hue ?? HUES[i % HUES.length],
  sort: i
}))
