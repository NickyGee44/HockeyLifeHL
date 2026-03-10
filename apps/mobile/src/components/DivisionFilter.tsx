import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Division } from '../lib/supabase/data';
import colors from '../theme/colors';

type Props = {
  divisions: Division[];
  activeDivision: Division | null;
  primaryColor: string;
  onSelect: (division: Division | null) => void;
};

export default function DivisionFilter({ divisions, activeDivision, primaryColor, onSelect }: Props) {
  if (divisions.length <= 1) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scroll}
      >
        <Pressable
          style={[styles.pill, activeDivision === null ? { backgroundColor: primaryColor } : { backgroundColor: colors.bgInteractive }]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.pillText, activeDivision === null ? { color: '#111' } : { color: colors.textSecondary }]}>
            All
          </Text>
        </Pressable>

        {divisions.map((division) => {
          const isActive = activeDivision?.id === division.id;
          return (
            <Pressable
              key={division.id}
              style={[styles.pill, isActive ? { backgroundColor: primaryColor } : { backgroundColor: colors.bgInteractive }]}
              onPress={() => onSelect(division)}
            >
              <Text style={[styles.pillText, isActive ? { color: '#111' } : { color: colors.textSecondary }]}>
                {division.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
    // Do NOT set overflow or fixed height here — let content breathe
  },
  scroll: {
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    // No maxWidth, no flexShrink — pills take exactly as much space as their text needs
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    // No numberOfLines — never truncate
  },
});
