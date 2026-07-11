import React, { cloneElement, isValidElement, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/colors';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  /** Único filho: o ScrollView/FlatList a ser envolvido. */
  children: React.ReactElement<any>;
};

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;

/**
 * RefreshControl do react-native-web é um no-op (renderiza uma View vazia,
 * sem gesto nem indicador algum) — então "puxar para atualizar" nunca
 * funcionava na versão web. No nativo usamos o RefreshControl de verdade
 * (melhor UX, integrado ao SO); na web reimplementamos o gesto na mão.
 */
export function PullToRefresh({ refreshing, onRefresh, children }: Props) {
  if (!isValidElement(children)) return children;

  if (Platform.OS !== 'web') {
    return cloneElement(children, {
      refreshControl: (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      ),
    } as any);
  }

  return (
    <WebPullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
      {children}
    </WebPullToRefresh>
  );
}

function WebPullToRefresh({ refreshing, onRefresh, children }: Props) {
  const [pull, setPull] = useState(0);
  const scrollTopRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  const handleScroll = useCallback((e: any) => {
    const native = e?.nativeEvent ?? e;
    scrollTopRef.current = native?.contentOffset?.y ?? native?.target?.scrollTop ?? 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: any) => {
      if (refreshing || scrollTopRef.current > 0) {
        startYRef.current = null;
        draggingRef.current = false;
        return;
      }
      const y = e?.nativeEvent?.touches?.[0]?.pageY;
      startYRef.current = typeof y === 'number' ? y : null;
      draggingRef.current = startYRef.current != null;
    },
    [refreshing]
  );

  const handleTouchMove = useCallback((e: any) => {
    if (!draggingRef.current || startYRef.current == null) return;
    const y = e?.nativeEvent?.touches?.[0]?.pageY;
    if (typeof y !== 'number') return;
    const delta = y - startYRef.current;
    setPull(delta > 0 ? Math.min(delta * 0.5, MAX_PULL) : 0);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (draggingRef.current && pull >= PULL_THRESHOLD && !refreshing) {
      onRefresh();
    }
    draggingRef.current = false;
    startYRef.current = null;
    setPull(0);
  }, [pull, refreshing, onRefresh]);

  if (!isValidElement(children)) return children;

  const existingOnScroll = (children.props as any).onScroll;
  const clonedChild = cloneElement(children, {
    onScroll: (e: any) => {
      handleScroll(e);
      existingOnScroll?.(e);
    },
    scrollEventThrottle: 16,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  } as any);

  const indicatorHeight = refreshing ? 48 : pull;

  return (
    <View style={styles.wrap}>
      {indicatorHeight > 0 && (
        <View style={[styles.indicator, { height: indicatorHeight }]}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
      {clonedChild}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
