import { Alert as RNAlert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * react-native-web implementa Alert.alert como um no-op (não mostra nada),
 * então em toda a versão web nenhuma confirmação ou mensagem de erro aparecia
 * — os botões pareciam "não fazer nada". Este wrapper usa window.confirm/alert
 * na web e o Alert nativo do RN nas demais plataformas, mantendo a mesma API.
 */
function alertOnWeb(title: string, message?: string, buttons?: AlertButton[]): void {
  const body = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(body);
    return;
  }

  if (buttons.length === 1) {
    window.alert(body);
    buttons[0].onPress?.();
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel') ?? buttons[0];
  const confirmButton = buttons.find((b) => b !== cancelButton) ?? buttons[buttons.length - 1];

  if (window.confirm(body)) {
    confirmButton.onPress?.();
  } else {
    cancelButton.onPress?.();
  }
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    if (Platform.OS === 'web') {
      alertOnWeb(title, message, buttons);
      return;
    }
    RNAlert.alert(title, message, buttons);
  },
};
