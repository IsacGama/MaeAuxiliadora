import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrgContext } from '../mobile/hooks/use-org-context';
import { createThemeWithMode } from '../mobile/theme';
import { useThemePreference } from '../mobile/theme-preference';
import {
  devotionLanguageLabels,
  getRosaryMysteryByDate,
  getRosaryStepPrayerText,
  rosary,
  rosaryMysteryLabels,
  type DevotionLanguage,
  type RosaryMysteryKey,
} from '../mobile/devotions';

type RosaryProgressPayload = {
  mysteryKey: RosaryMysteryKey;
  language: DevotionLanguage;
  stepIndex: number;
};

const STORAGE_KEY = '@devotions:rosary:progress';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  mysteryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prayerText: {
    fontSize: 15,
    lineHeight: 23,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mysteryItem: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mysteryItemText: {
    fontSize: 13,
    lineHeight: 19,
  },
});

export default function RosaryScreen() {
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const [mysteryKey, setMysteryKey] = useState<RosaryMysteryKey>(() => getRosaryMysteryByDate(new Date()));
  const [language, setLanguage] = useState<DevotionLanguage>('pt');
  const [stepIndex, setStepIndex] = useState(0);

  const steps = rosary.structure;
  const currentStep = steps[stepIndex] ?? steps[0];

  useEffect(() => {
    let active = true;

    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active || !raw) {
          return;
        }

        const parsed = JSON.parse(raw) as RosaryProgressPayload;
        if (parsed.mysteryKey) {
          setMysteryKey(parsed.mysteryKey);
        }
        if (parsed.language) {
          setLanguage(parsed.language);
        }
        if (typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0) {
          setStepIndex(Math.min(parsed.stepIndex, steps.length - 1));
        }
      } catch {
        // Ignora payload inválido.
      }
    };

    void loadState();

    return () => {
      active = false;
    };
  }, [steps.length]);

  useEffect(() => {
    const safeIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
    const payload: RosaryProgressPayload = {
      mysteryKey,
      language,
      stepIndex: safeIndex,
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [language, mysteryKey, stepIndex, steps.length]);

  const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;
  const currentMystery =
    currentStep.decade > 0
      ? rosary.mysteries[mysteryKey][currentStep.decade - 1] ?? null
      : null;
  const prayerText = getRosaryStepPrayerText(currentStep.type, language);

  const moveStep = (direction: 'prev' | 'next') => {
    setStepIndex((current) => {
      if (direction === 'prev') {
        return Math.max(0, current - 1);
      }
      return Math.min(steps.length - 1, current + 1);
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Pressable style={[styles.backButton, { borderColor: theme.border }]} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.primary }]}>Rosário Guiado</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Seu progresso fica salvo automaticamente no dispositivo.</Text>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Mistérios</Text>
          <View style={styles.buttonRow}>
            {(Object.keys(rosaryMysteryLabels) as RosaryMysteryKey[]).map((nextMystery) => {
              const isSelected = nextMystery === mysteryKey;
              return (
                <Pressable
                  key={nextMystery}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? theme.secondary : theme.border,
                      backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                    },
                  ]}
                  onPress={() => {
                    setMysteryKey(nextMystery);
                    setStepIndex(0);
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
                    {rosaryMysteryLabels[nextMystery]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            {(Object.keys(devotionLanguageLabels) as DevotionLanguage[]).map((nextLanguage) => {
              const isSelected = nextLanguage === language;
              return (
                <Pressable
                  key={nextLanguage}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? theme.secondary : theme.border,
                      backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                    },
                  ]}
                  onPress={() => setLanguage(nextLanguage)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
                    {devotionLanguageLabels[nextLanguage]}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.chip, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => {
                setMysteryKey(getRosaryMysteryByDate(new Date()));
                setStepIndex(0);
              }}
            >
              <Text style={[styles.chipText, { color: theme.primary }]}>Mistérios de hoje</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Etapa {stepIndex + 1} de {steps.length}</Text>
          <View style={[styles.progressTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
            <View style={[styles.progressFill, { backgroundColor: theme.secondary, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>{Math.round(progress)}% concluído</Text>
        </View>

        <View style={[styles.card, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.08)' }]}> 
          <Text style={[styles.stepTitle, { color: theme.primary }]}>{currentStep.label}</Text>
          {currentMystery ? (
            <Text style={[styles.mysteryText, { color: theme.secondary }]}>{currentStep.decade}º mistério: {currentMystery}</Text>
          ) : (
            <Text style={[styles.mysteryText, { color: theme.secondary }]}>Orações iniciais/finais</Text>
          )}

          <Text style={[styles.prayerText, { color: theme.text }]}>{prayerText}</Text>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => moveStep('prev')}
              disabled={stepIndex === 0}
            >
              <MaterialCommunityIcons name="chevron-left" size={16} color={stepIndex === 0 ? theme.textSoft : theme.primary} />
              <Text style={[styles.actionButtonText, { color: stepIndex === 0 ? theme.textSoft : theme.primary }]}>Anterior</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.15)' }]}
              onPress={() => moveStep('next')}
              disabled={stepIndex >= steps.length - 1}
            >
              <Text style={[styles.actionButtonText, { color: stepIndex >= steps.length - 1 ? theme.textSoft : theme.secondary }]}>Próxima oração</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={stepIndex >= steps.length - 1 ? theme.textSoft : theme.secondary} />
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => setStepIndex(0)}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Recomeçar</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.primary }]}>Mistérios selecionados</Text>
          {rosary.mysteries[mysteryKey].map((mystery, index) => {
            const decade = index + 1;
            const isCurrent = currentStep.decade === decade;

            return (
              <View
                key={`${mysteryKey}-${decade}`}
                style={[
                  styles.mysteryItem,
                  {
                    borderColor: isCurrent ? theme.secondary : theme.border,
                    backgroundColor: isCurrent ? 'rgba(218, 139, 60, 0.12)' : theme.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.mysteryItemText,
                    { color: isCurrent ? theme.text : theme.textSoft },
                  ]}
                >
                  <Text style={{ fontWeight: '800' }}>{decade}. </Text>
                  {mystery}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
