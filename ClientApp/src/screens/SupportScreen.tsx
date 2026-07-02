import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from '../config/constants';
import { ScreenHeader } from '../components/ui';
import { colors, radius, shadows, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Support'>;

interface ChannelProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  sub: string;
  onPress: () => void;
  last?: boolean;
}

function Channel({ icon, color, bg, title, sub, onPress, last }: ChannelProps) {
  return (
    <TouchableOpacity style={[styles.channel, last && styles.channelLast]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.channelIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.channelText}>
        <Text style={styles.channelTitle}>{title}</Text>
        <Text style={styles.channelSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SupportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Support" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <Text style={styles.intro}>Une question, un problème avec une course ? Contactez-nous directement.</Text>

        <View style={styles.card}>
          <Channel
            icon="logo-whatsapp"
            color={colors.whatsappDark}
            bg={colors.whatsappMuted}
            title="WhatsApp"
            sub={SUPPORT_WHATSAPP}
            onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}`)}
          />
          <Channel
            icon="call"
            color={colors.accent}
            bg={colors.accentMuted}
            title="Appeler le support"
            sub={SUPPORT_PHONE}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          />
          <Channel
            icon="mail"
            color={colors.text}
            bg={colors.surfaceAlt}
            title="Envoyer un email"
            sub={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            last
          />
        </View>

        <View style={styles.hoursCard}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.hoursText}>Service disponible 24h/24, 7j/7</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  intro: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm },
  channel: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  channelLast: { borderBottomWidth: 0 },
  channelIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  channelText: { flex: 1 },
  channelTitle: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  channelSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  hoursCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.md,
  },
  hoursText: { ...typography.bodySm, color: colors.textSecondary, fontWeight: '600' },
});
