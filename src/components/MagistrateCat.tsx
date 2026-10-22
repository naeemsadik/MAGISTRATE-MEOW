import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { PetMood } from '../types';

const FUR = '#E8A25B';
const FUR_DARK = '#C27A35';
const CREAM = '#F6DDBF';
const INNER_EAR = '#F4A6A6';
const NOSE = '#E77D8A';
const INK = '#111827';
const GOLD = '#F59E0B';
const GOLD_DARK = '#B45309';
const EMERALD = '#10B981';

interface Props {
  mood: PetMood;
  size?: number;
  onPress?: () => void;
  /** Velvet cushion under the cat (Home hero). */
  cushion?: boolean;
  /** Changes on every new bubble so the cat reacts even when the mood repeats. */
  reactKey?: string | number;
}

export function MagistrateCat({ mood, size = 200, onPress, cushion = false, reactKey }: Props) {
  const [breathe] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const duration = mood === 'sleepy' ? 2600 : 1700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, mood]);

  useEffect(() => {
    wiggle.setValue(0);
    Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 140, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0.5, duration: 110, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();
  }, [mood, reactKey, wiggle]);

  useEffect(() => {
    if (mood === 'sleepy' || mood === 'proud') return;
    let closeTimer: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setBlinking(true);
      closeTimer = setTimeout(() => setBlinking(false), 140);
    }, 3800);
    return () => {
      clearInterval(interval);
      clearTimeout(closeTimer);
    };
  }, [mood]);

  const handlePress = () => {
    pop.setValue(0.9);
    Animated.spring(pop, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    onPress?.();
  };

  const bounce = mood === 'excited' ? -10 : -3;
  const animatedStyle = {
    transform: [
      { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, bounce] }) },
      { scale: Animated.multiply(pop, breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })) },
      { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) },
    ],
  };

  const height = size * 1.05;

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={onPress ? 'Magistrate Meow. Tap for the next message.' : 'Magistrate Meow'}
      hitSlop={8}
    >
      <View style={{ width: size, height }}>
        {cushion && (
          <Svg width={size} height={height} viewBox="0 0 200 210" style={StyleSheet.absoluteFill}>
            <Ellipse cx={100} cy={196} rx={86} ry={13} fill="#7F1D1D" />
            <Ellipse cx={100} cy={192} rx={80} ry={9} fill="#991B1B" />
            <Path d="M22 196 Q100 214 178 196" stroke={GOLD} strokeWidth={2.5} fill="none" />
            <Circle cx={18} cy={198} r={4} fill={GOLD} />
            <Circle cx={182} cy={198} r={4} fill={GOLD} />
          </Svg>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <Svg width={size} height={height} viewBox="0 0 200 210">
            <CatBody mood={mood} blinking={blinking} />
          </Svg>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function CatBody({ mood, blinking }: { mood: PetMood; blinking: boolean }) {
  return (
    <G>
      {/* Tail */}
      <Path d="M142 178 C188 176 192 128 170 110" stroke={FUR_DARK} strokeWidth={13} strokeLinecap="round" fill="none" />

      {/* Body + belly */}
      <Ellipse cx={100} cy={150} rx={52} ry={42} fill={FUR} />
      <Ellipse cx={100} cy={160} rx={30} ry={27} fill={CREAM} />

      {/* Judicial collar: black robe yoke, white bands, gold clasp */}
      <Path d="M62 126 Q100 152 138 126 L134 140 Q100 162 66 140 Z" fill={INK} />
      <Rect x={91} y={136} width={8} height={20} rx={2} fill="#F8FAFC" />
      <Rect x={101} y={136} width={8} height={20} rx={2} fill="#F8FAFC" />
      <Circle cx={100} cy={137} r={4} fill={GOLD} />

      {/* Paws */}
      {mood !== 'excited' && (
        <G>
          <Ellipse cx={80} cy={188} rx={14} ry={9} fill={FUR} />
          <Ellipse cx={120} cy={188} rx={14} ry={9} fill={FUR} />
          <Path d="M75 191 L75 186 M81 192 L81 186 M115 192 L115 186 M121 191 L121 186" stroke={FUR_DARK} strokeWidth={1.6} />
        </G>
      )}

      {/* Head */}
      <Path d="M56 52 L62 12 L94 40 Z" fill={FUR} />
      <Path d="M144 52 L138 12 L106 40 Z" fill={FUR} />
      <Path d="M64 46 L67 24 L86 40 Z" fill={INNER_EAR} />
      <Path d="M136 46 L133 24 L114 40 Z" fill={INNER_EAR} />
      <Ellipse cx={100} cy={78} rx={52} ry={45} fill={FUR} />
      <Path d="M91 38 L94 50 M100 36 L100 50 M109 38 L106 50" stroke={FUR_DARK} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={100} cy={97} rx={21} ry={14} fill={CREAM} />

      <Eyes mood={mood} blinking={blinking} />

      {/* Nose + whiskers */}
      <Path d="M95 88 L105 88 L100 94 Z" fill={NOSE} />
      <Path d="M78 95 L50 89 M78 100 L48 101 M122 95 L150 89 M122 100 L152 101" stroke="#FDF2E9" strokeWidth={1.5} strokeLinecap="round" />
      <Mouth mood={mood} />

      <Accessories mood={mood} />
    </G>
  );
}

function Eyes({ mood, blinking }: { mood: PetMood; blinking: boolean }) {
  if (mood === 'sleepy') {
    return (
      <G>
        <Path d="M71 76 Q80 83 89 76" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
        <Path d="M111 76 Q120 83 129 76" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'excited') {
    return (
      <G>
        <Path d="M71 78 Q80 66 89 78" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        <Path d="M111 78 Q120 66 129 78" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'proud') return null; // hidden behind sunglasses

  const ry = blinking ? 1.5 : 10;
  return (
    <G>
      <Ellipse cx={80} cy={74} rx={8} ry={ry} fill={INK} />
      <Ellipse cx={120} cy={74} rx={8} ry={ry} fill={INK} />
      {!blinking && (
        <G>
          <Circle cx={83} cy={70} r={2.6} fill="#FFFFFF" />
          <Circle cx={123} cy={70} r={2.6} fill="#FFFFFF" />
        </G>
      )}
      {mood === 'sassy' && !blinking && (
        <G>
          {/* Half-lidded side-eye + one raised brow */}
          <Rect x={70} y={62} width={20} height={9} fill={FUR} />
          <Rect x={110} y={62} width={20} height={9} fill={FUR} />
          <Path d="M110 56 Q121 49 131 55" stroke={FUR_DARK} strokeWidth={3} fill="none" strokeLinecap="round" />
        </G>
      )}
    </G>
  );
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === 'excited') {
    return <Path d="M89 98 Q100 114 111 98 Z" fill="#7F1D1D" />;
  }
  if (mood === 'sassy' || mood === 'proud') {
    return <Path d="M92 100 Q103 104 112 96" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />;
  }
  return (
    <Path
      d="M100 94 Q95 101 90 98 M100 94 Q105 101 110 98"
      stroke={INK}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function RoundGlasses() {
  return (
    <G>
      <Circle cx={80} cy={74} r={14} stroke={INK} strokeWidth={4} fill="rgba(255,255,255,0.10)" />
      <Circle cx={120} cy={74} r={14} stroke={INK} strokeWidth={4} fill="rgba(255,255,255,0.10)" />
      <Path d="M94 73 Q100 69 106 73" stroke={INK} strokeWidth={3.5} fill="none" />
      <Path d="M66 72 L54 66 M134 72 L146 66" stroke={INK} strokeWidth={3} />
    </G>
  );
}

function Gavel() {
  return (
    <G>
      <Line x1={132} y1={184} x2={160} y2={146} stroke="#92400E" strokeWidth={6} strokeLinecap="round" />
      <G transform="rotate(-36 162 142)">
        <Rect x={146} y={133} width={32} height={18} rx={4} fill={GOLD_DARK} />
        <Rect x={150} y={133} width={4} height={18} fill={GOLD} />
        <Rect x={170} y={133} width={4} height={18} fill={GOLD} />
      </G>
    </G>
  );
}

function Accessories({ mood }: { mood: PetMood }) {
  switch (mood) {
    case 'nerd':
      return (
        <G>
          {/* Square scholar glasses */}
          <Rect x={64} y={62} width={32} height={24} rx={4} stroke={INK} strokeWidth={4} fill="rgba(255,255,255,0.10)" />
          <Rect x={104} y={62} width={32} height={24} rx={4} stroke={INK} strokeWidth={4} fill="rgba(255,255,255,0.10)" />
          <Line x1={96} y1={72} x2={104} y2={72} stroke={INK} strokeWidth={3.5} />
          <Path d="M64 70 L54 66 M136 70 L146 66" stroke={INK} strokeWidth={3} />
          {/* Open book held in paws */}
          <Path d="M100 156 L68 149 L68 186 L100 193 Z" fill="#F8FAFC" stroke={EMERALD} strokeWidth={3} />
          <Path d="M100 156 L132 149 L132 186 L100 193 Z" fill="#E2E8F0" stroke={EMERALD} strokeWidth={3} />
          <Path d="M74 160 L94 164 M74 168 L94 172 M74 176 L94 180 M106 164 L126 160 M106 172 L126 168 M106 180 L126 176" stroke="#94A3B8" strokeWidth={1.5} />
        </G>
      );
    case 'sassy':
      return (
        <G>
          <RoundGlasses />
          <Gavel />
        </G>
      );
    case 'excited':
      return (
        <G>
          <RoundGlasses />
          {/* Paws up */}
          <Path d="M58 132 Q40 112 46 92" stroke={FUR} strokeWidth={16} strokeLinecap="round" fill="none" />
          <Path d="M142 132 Q160 112 154 92" stroke={FUR} strokeWidth={16} strokeLinecap="round" fill="none" />
          <Circle cx={46} cy={90} r={10} fill={FUR} />
          <Circle cx={154} cy={90} r={10} fill={FUR} />
          <Ellipse cx={80} cy={188} rx={14} ry={9} fill={FUR} />
          <Ellipse cx={120} cy={188} rx={14} ry={9} fill={FUR} />
          {/* Sparkles */}
          <Path d="M26 50 L29 58 L37 61 L29 64 L26 72 L23 64 L15 61 L23 58 Z" fill={GOLD} />
          <Path d="M174 40 L176 46 L182 48 L176 50 L174 56 L172 50 L166 48 L172 46 Z" fill={GOLD} />
          <Path d="M180 150 L182 155 L187 157 L182 159 L180 164 L178 159 L173 157 L178 155 Z" fill={EMERALD} />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          {/* Nightcap */}
          <Path d="M56 50 Q100 4 144 50 Z" fill="#6366F1" />
          <Path d="M100 14 Q150 2 162 42" stroke="#6366F1" strokeWidth={14} strokeLinecap="round" fill="none" />
          <Circle cx={163} cy={46} r={9} fill="#F8FAFC" />
          <Path d="M54 50 Q100 38 146 50" stroke="#F8FAFC" strokeWidth={8} strokeLinecap="round" fill="none" />
          {/* Cup of cha with steam */}
          <Path d="M128 170 L156 170 L154 188 Q152 194 146 194 L138 194 Q132 194 130 188 Z" fill="#F8FAFC" />
          <Path d="M155 175 Q164 176 162 184 Q160 189 154 188" stroke="#F8FAFC" strokeWidth={3} fill="none" />
          <Ellipse cx={142} cy={171} rx={13} ry={3} fill="#92400E" />
          <Path d="M136 164 Q132 158 137 152 M146 164 Q142 156 148 150" stroke="#94A3B8" strokeWidth={2} fill="none" strokeLinecap="round" />
          <SvgText x={150} y={28} fill="#94A3B8" fontSize={16} fontWeight="bold">z</SvgText>
          <SvgText x={166} y={14} fill="#94A3B8" fontSize={20} fontWeight="bold">Z</SvgText>
        </G>
      );
    case 'proud':
      return (
        <G>
          {/* Crown */}
          <Path d="M74 38 L80 14 L90 28 L100 8 L110 28 L120 14 L126 38 Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth={2} />
          <Circle cx={100} cy={28} r={3.5} fill={EMERALD} />
          <Circle cx={84} cy={32} r={2.5} fill="#F43F5E" />
          <Circle cx={116} cy={32} r={2.5} fill="#F43F5E" />
          {/* Cool sunglasses */}
          <Path d="M62 66 L96 66 L93 82 Q90 88 80 88 Q68 88 64 80 Z" fill={INK} />
          <Path d="M104 66 L138 66 L136 80 Q132 88 120 88 Q110 88 107 82 Z" fill={INK} />
          <Line x1={96} y1={68} x2={104} y2={68} stroke={INK} strokeWidth={4} />
          <Path d="M70 70 L78 70 M112 70 L120 70" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
          <Gavel />
        </G>
      );
  }
}
