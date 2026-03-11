import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLeague } from '../context/LeagueContext';
import colors from '../theme/colors';

export default function LeagueSwitcher() {
  const { activeLeague, availableLeagues, setActiveLeague, activeTheme } = useLeague();
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(79,216,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.dot, { backgroundColor: activeTheme.primaryColor }]} />
        <Text style={styles.triggerText}>{activeLeague?.name ?? 'BLH'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.optionRow}
              onPress={() => {
                setActiveLeague(null);
                setVisible(false);
              }}
            >
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>BLH Global View</Text>
                <Text style={styles.optionMeta}>All leagues</Text>
              </View>
              {!activeLeague ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
            </Pressable>

            {availableLeagues.map((league) => {
              const selected = activeLeague?.id === league.id;

              return (
                <Pressable
                  key={league.id}
                  style={styles.optionRow}
                  onPress={() => {
                    setActiveLeague(league);
                    setVisible(false);
                  }}
                >
                  <View style={[styles.dot, { backgroundColor: league.theme.primaryColor }]} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{league.name}</Text>
                    <Text style={styles.optionMeta}>{(league as any).record ?? league.city ?? ''}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark" size={16} color={league.theme.primaryColor} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.glassStroke,
    overflow: 'hidden',
  },
  triggerText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.66)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassStrokeStrong,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassStroke,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  optionMeta: {
    marginTop: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
