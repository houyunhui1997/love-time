export type WishCategory = 'see' | 'travel' | 'experience' | 'memory' | 'partner'
export type WishCategoryFilter = 'all' | WishCategory

export interface WishTemplate {
  id: string
  category: WishCategory
  title: string
  description: string
  cover: string
}

export const WISH_CATEGORIES: Array<{ value: WishCategoryFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'see', label: '一起去看看' },
  { value: 'travel', label: '一起去旅行' },
  { value: 'experience', label: '一起体验' },
  { value: 'memory', label: '留下纪念' },
  { value: 'partner', label: '想为TA做' }
]

const cover = (name: string) => `https://mp-a2c13372-7ceb-425d-bcf7-06fc03fcfe22.cdn.bspapp.com/static/wish/${name}.png`

export const WISH_TEMPLATES: WishTemplate[] = [
  { id: 'see-sea', category: 'see', title: '一起去看海', description: '找个天气好的日子，和你去吹吹海风', cover: cover('see-sea') },
  { id: 'see-sunrise', category: 'see', title: '一起看日出', description: '和你一起，迎接新一天的第一缕阳光', cover: cover('see-sunrise') },
  { id: 'see-park', category: 'see', title: '一起去游乐园', description: '像小朋友一样，开心一整天', cover: cover('see-park') },
  { id: 'see-cook', category: 'see', title: '一起做一顿饭', description: '在烟火气里，享受简单的幸福', cover: cover('see-cook') },
  { id: 'see-photos', category: 'see', title: '拍一组情侣照片', description: '把普通日子也留成故事', cover: cover('see-photos') },

  { id: 'travel-coast', category: 'travel', title: '一起去海边城市', description: '吹吹海风，把喜欢藏进晚霞里', cover: cover('travel-coast') },
  { id: 'travel-weekend', category: 'travel', title: '来一次周末短途旅行', description: '不用太远，和你出发就很好', cover: cover('travel-weekend') },
  { id: 'travel-snow', category: 'travel', title: '一起去看雪', description: '想和你走在白白的冬天里', cover: cover('travel-snow') },
  { id: 'travel-rail', category: 'travel', title: '一起坐一次高铁去远方', description: '沿途的风景，也想和你一起看', cover: cover('travel-rail') },
  { id: 'travel-cabin', category: 'travel', title: '一起住一次山间民宿', description: '在安静的地方，过两天慢慢的日子', cover: cover('travel-cabin') },
  { id: 'travel-city', category: 'travel', title: '一起去一座陌生城市', description: '把新的回忆，留在没去过的地方', cover: cover('travel-city') },

  { id: 'experience-wheel', category: 'experience', title: '一起坐摩天轮', description: '在慢慢升高的风景里靠近彼此', cover: cover('experience-wheel') },
  { id: 'experience-pottery', category: 'experience', title: '一起做陶艺', description: '把笨拙和喜欢，捏成独一份回忆', cover: cover('experience-pottery') },
  { id: 'experience-concert', category: 'experience', title: '一起去看演唱会', description: '在人海和歌声里，跟你一起心动', cover: cover('experience-concert') },
  { id: 'experience-camping', category: 'experience', title: '一起露营一次', description: '在夜色和灯光里，拥有一个小小世界', cover: cover('experience-camping') },
  { id: 'experience-park', category: 'experience', title: '一起去游乐园', description: '像小朋友一样，开心一整天', cover: cover('experience-park') },
  { id: 'experience-dessert', category: 'experience', title: '一起体验手作甜品', description: '把甜甜的心情，认真做出来', cover: cover('experience-dessert') },

  { id: 'memory-polaroid', category: 'memory', title: '留一张拍立得', description: '把那一刻的心动，轻轻握在手里', cover: cover('memory-polaroid') },
  { id: 'memory-ticket', category: 'memory', title: '保存一张电影票根', description: '把那天的约会，夹进回忆里', cover: cover('memory-ticket') },
  { id: 'memory-journal', category: 'memory', title: '做一页恋爱手账', description: '把零碎的小甜蜜，认真收进日记里', cover: cover('memory-journal') },
  { id: 'memory-voice', category: 'memory', title: '录一段纪念语音', description: '把声音里的温柔，也悄悄留住', cover: cover('memory-voice') },
  { id: 'memory-object', category: 'memory', title: '收集一件小纪念物', description: '哪怕是一枚贝壳，也有那天的意义', cover: cover('memory-object') },
  { id: 'memory-card', category: 'memory', title: '写给未来的一张卡', description: '把今天的心愿，留给以后的我们', cover: cover('memory-card') },

  { id: 'partner-flowers', category: 'partner', title: '准备一束花', description: '在特别的日子里，把喜欢轻轻送给你', cover: cover('partner-flowers') },
  { id: 'partner-cook', category: 'partner', title: '亲手做一顿饭', description: '想把温柔和心意，都放进热气里', cover: cover('partner-cook') },
  { id: 'partner-birthday', category: 'partner', title: '给TA做生日惊喜', description: '把那天变成值得记很久的回忆', cover: cover('partner-birthday') },
  { id: 'partner-night', category: 'partner', title: '写一张晚安卡片', description: '把一天的想念，留在睡前的一句晚安', cover: cover('partner-night') },
  { id: 'partner-gift', category: 'partner', title: '送TA一个小礼物', description: '不需要很贵，只要想到你就想送', cover: cover('partner-gift') },
  { id: 'partner-learn', category: 'partner', title: '为TA学会一件事', description: '因为是你，所以愿意认真去学', cover: cover('partner-learn') }
]
