import { StyleSheet, Text, View } from 'react-native';

import colors from '../theme/colors';

type StatPillProps = {
  label: string;
  value: string | number;
};

export default function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.bgInteractive,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
});
