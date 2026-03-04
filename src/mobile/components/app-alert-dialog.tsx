import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppTheme, getTextColorForBackground, withAlpha } from '../theme';

export type AppAlertDialogVariant = 'danger' | 'info' | 'success';

type AppAlertDialogProps = {
  visible: boolean;
  theme: AppTheme;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AppAlertDialogVariant;
  confirmLoading?: boolean;
  showCancelButton?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onDismiss?: () => void | Promise<void>;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 24, 0.62)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

const iconByVariant: Record<AppAlertDialogVariant, keyof typeof MaterialCommunityIcons.glyphMap> = {
  danger: 'alert-circle-outline',
  info: 'information-outline',
  success: 'check-circle-outline',
};

const colorByVariant = (variant: AppAlertDialogVariant, theme: AppTheme) => {
  if (variant === 'danger') return theme.destructive;
  if (variant === 'success') return '#16A34A';
  return theme.secondary;
};

export const AppAlertDialog = ({
  visible,
  theme,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'info',
  confirmLoading = false,
  showCancelButton = true,
  onConfirm,
  onCancel,
  onDismiss,
}: AppAlertDialogProps) => {
  const variantColor = colorByVariant(variant, theme);
  const confirmTextColor = getTextColorForBackground(variantColor);
  const dismissHandler = onDismiss ?? onCancel;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => {
        void dismissHandler();
      }}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          void dismissHandler();
        }}
      >
        <Pressable
          style={[
            styles.panel,
            {
              borderColor: theme.border,
              backgroundColor: theme.surfaceOpaque,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconChip,
                { backgroundColor: withAlpha(variantColor, 0.16) },
              ]}
            >
              <MaterialCommunityIcons
                name={iconByVariant[variant]}
                size={20}
                color={variantColor}
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          </View>

          {!!description && (
            <Text style={[styles.description, { color: theme.textSoft }]}>
              {description}
            </Text>
          )}

          <View style={styles.actionsRow}>
            {showCancelButton ? (
              <Pressable
                style={[
                  styles.actionButton,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
                onPress={() => {
                  void onCancel();
                }}
                disabled={confirmLoading}
              >
                <Text style={[styles.actionText, { color: theme.textSoft }]}>
                  {cancelLabel}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.actionButton,
                { borderColor: variantColor, backgroundColor: variantColor },
              ]}
              onPress={() => {
                void onConfirm();
              }}
              disabled={confirmLoading}
            >
              {confirmLoading ? (
                <ActivityIndicator size="small" color={confirmTextColor} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={variant === 'danger' ? 'logout' : 'check'}
                    size={16}
                    color={confirmTextColor}
                  />
                  <Text style={[styles.actionText, { color: confirmTextColor }]}>
                    {confirmLabel}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
