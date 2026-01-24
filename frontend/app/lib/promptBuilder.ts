import { PROMPT_TEMPLATE } from './promptTemplate';

export type PromptInput = {
  type?: string;
  rarity?: string;
  cardName?: string;
  attribute?: string;
  attack?: string;
  health?: string;
  cardNumber?: string;
  skill1Name?: string;
  skill1Description?: string;
  skill2Name?: string;
  skill2Description?: string;
  flavorText?: string;
  series?: string;
  characterImageRef?: string;
  backgroundImageRef?: string;
};

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  if (max <= 3) return value.slice(0, max);
  return `${value.slice(0, max - 3)}...`;
};

export const buildPrompt = (input: PromptInput) => {
  const typeStr = input.type?.trim() ? input.type : '[타입]';
  const rarityStr = input.rarity?.trim() ? input.rarity : '[등급]';
  const cardNameStr = input.cardName?.trim() ? input.cardName : '카드명';
  const attributeStr = input.attribute?.trim() ? input.attribute : '[속성]';
  const attackStr = input.attack?.trim() ? input.attack : '0';
  const healthStr = input.health?.trim() ? input.health : '0';
  const cardNumberStr = input.cardNumber?.trim()
    ? `#${input.cardNumber.trim().padStart(3, '0')}`
    : '[카드번호]';
  const seriesStr = input.series?.trim() ? input.series : '[시리즈]';

  const skillBlocks: string[] = [];
  if (input.skill1Name?.trim()) {
    const skill1Name = truncate(input.skill1Name, 12);
    const skill1Desc = input.skill1Description ? truncate(input.skill1Description, 30) : '';
    skillBlocks.push(
      `│  │  [스킬 1] ${skill1Name.padEnd(20)}│\n│  │  • ${skill1Desc.padEnd(30)}│\n│  │                                 │\n`,
    );
  }
  if (input.skill2Name?.trim()) {
    const skill2Name = truncate(input.skill2Name, 12);
    const skill2Desc = input.skill2Description ? truncate(input.skill2Description, 30) : '';
    skillBlocks.push(
      `│  │  [스킬 2] ${skill2Name.padEnd(20)}│\n│  │  • ${skill2Desc.padEnd(30)}│\n│  │                                 │\n`,
    );
  }

  const skillsBlock = skillBlocks.join('') || '│  │                                 │\n';
  const flavorBlock = input.flavorText?.trim()
    ? `│  │  "${truncate(input.flavorText, 35).padEnd(35)}"│\n│  │                                 │\n`
    : '│  │                                 │\n';
  const statsLine = `⚔️ ${attackStr}  ❤️ ${healthStr}`.padEnd(35);
  const leftMeta = cardNumberStr.padEnd(18);
  const rightMeta = seriesStr.padEnd(17);
  const metaLine = `${leftMeta}${rightMeta}`;

  const cardData = {
    layout: {
      layer2: {
        type: '배경 이미지',
        description: '카드 전체를 덮는 배경 이미지',
        reference: input.backgroundImageRef || '없음',
      },
      layer1: {
        type: '메인 캐릭터 이미지',
        description: '배경 위 중앙에 배치되는 메인 캐릭터',
        reference: input.characterImageRef || '없음',
      },
    },
    header: {
      type: typeStr,
      rarity: rarityStr,
      cardName: cardNameStr,
      attribute: attributeStr,
    },
    skills: [] as Array<{ name: string; description: string }>,
    stats: {
      attack: attackStr,
      health: healthStr,
    },
    description: input.flavorText || null,
    meta: {
      cardNumber: cardNumberStr,
      series: seriesStr,
    },
  };

  if (input.skill1Name?.trim()) {
    cardData.skills.push({
      name: input.skill1Name,
      description: input.skill1Description || '',
    });
  }
  if (input.skill2Name?.trim()) {
    cardData.skills.push({
      name: input.skill2Name,
      description: input.skill2Description || '',
    });
  }

  const replacements: Record<string, string> = {
    '{{type}}': typeStr,
    '{{rarity}}': rarityStr,
    '{{cardName}}': cardNameStr,
    '{{attribute}}': attributeStr,
    '{{skillsBlock}}': skillsBlock,
    '{{flavorBlock}}': flavorBlock,
    '{{statsLine}}': statsLine,
    '{{metaLine}}': metaLine,
    '{{cardDataJson}}': JSON.stringify(cardData, null, 2),
  };

  let prompt = PROMPT_TEMPLATE;
  Object.entries(replacements).forEach(([key, value]) => {
    prompt = prompt.split(key).join(value);
  });

  return prompt;
};
