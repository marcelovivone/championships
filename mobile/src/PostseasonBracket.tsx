import React from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  type Match,
  type PostseasonBracket as PostseasonBracketPayload,
  type PostseasonPhase,
} from './api';

type Props = {
  bracket?: PostseasonBracketPayload;
  activePhase: string;
  activePhaseDetail: string;
  sportKey?: string;
  groupLabelMap?: Record<number, string>;
};

type Series = {
  id: string;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  matches: Match[];
  winsById: Record<string, number>;
  groupId?: number | null;
  earliestDate: string;
};

type LayoutBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ConnectorSegment = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type BracketRelation = {
  parentKey: string;
  childKey: string;
  inverted?: boolean;
};

type BracketSlot = {
  key: string;
  series: Series | null;
  isPlaceholder: boolean;
};

const PHASE_ORDER = ['Play-ins', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'];
const PHASE_SLOT_COUNTS: Record<string, number | undefined> = {
  Finals: 1,
  Semifinals: 2,
  Quarterfinals: 4,
  'Round of 16': 8,
  'Round of 32': 16,
  'Round of 64': 32,
};
const NBA_FIRST_ROUND_TOP_SEEDS = [1, 4, 3, 2] as const;
const NBA_FIRST_ROUND_SLOT_SEED_PAIRS: Array<[number, number]> = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7],
];

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function getNbaPhaseDisplayName(phaseDetail: string): string {
  const mapping: Record<string, string> = {
    'Round of 16': 'First Round',
    Quarterfinals: 'Conf. Semifinals',
    Semifinals: 'Conf. Finals',
    Finals: 'Finals',
  };

  return mapping[phaseDetail] || phaseDetail;
}

function getGroupName(groupId: number | null | undefined, groupLabelMap?: Record<number, string>): string {
  if (groupId == null || !Number.isFinite(groupId)) {
    return '';
  }

  return groupLabelMap?.[Number(groupId)] || `Group ${groupId}`;
}

function formatShortDate(value?: string | null): string {
  if (!value) {
    return 'TBD';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getClubLabel(club?: Match['homeClub'] | null, fallback?: number | null, placeholder?: string | null): string {
  if (typeof placeholder === 'string' && placeholder.trim().toUpperCase() === 'TBD') {
    return 'TBD';
  }

  if (!club) {
    return placeholder || (fallback ? `Club ${fallback}` : 'TBD');
  }

  const shortName = club.shortName ?? club.short_name;
  const displayName = club.name;
  return shortName || displayName || placeholder || (fallback ? `Club ${fallback}` : 'TBD');
}

function getClubDisplayWithSeed(
  club?: Match['homeClub'] | null,
  fallback?: number | null,
  placeholder?: string | null,
  seed?: number,
): string {
  const label = getClubLabel(club, fallback, placeholder);
  if (label.toUpperCase() === 'TBD') {
    return 'TBD';
  }

  return seed != null ? `${seed} ${label}` : label;
}

function buildSeries(matches: Match[]): Series[] {
  const seriesMap = new Map<string, Series>();

  const makeKey = (match: Match) => {
    const homeId = match.homeClubId ?? null;
    const awayId = match.awayClubId ?? null;

    if (homeId != null && awayId != null) {
      const minId = Math.min(homeId, awayId);
      const maxId = Math.max(homeId, awayId);
      return `id:${minId}_${maxId}`;
    }

    const homeLabel = match.homeClubPlaceholder ?? match.homeClub?.shortName ?? match.homeClub?.short_name ?? match.homeClub?.name ?? `club_${homeId ?? 'tbd'}`;
    const awayLabel = match.awayClubPlaceholder ?? match.awayClub?.shortName ?? match.awayClub?.short_name ?? match.awayClub?.name ?? `club_${awayId ?? 'tbd'}`;
    return `ph:${[homeLabel, awayLabel].sort().join('|')}`;
  };

  (matches || []).forEach((match) => {
    const key = makeKey(match);
    const existing = seriesMap.get(key);

    if (!existing) {
      seriesMap.set(key, {
        id: key,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        homePlaceholder: match.homeClubPlaceholder,
        awayPlaceholder: match.awayClubPlaceholder,
        matches: [match],
        winsById: {},
        groupId: match.groupId ?? null,
        earliestDate: match.date ?? '',
      });
      return;
    }

    existing.matches.push(match);
    if (match.date && (!existing.earliestDate || match.date < existing.earliestDate)) {
      existing.earliestDate = match.date;
    }
  });

  seriesMap.forEach((series) => {
    series.matches.forEach((match) => {
      const homeScore = typeof match.homeScore === 'number' ? match.homeScore : null;
      const awayScore = typeof match.awayScore === 'number' ? match.awayScore : null;

      if (homeScore == null || awayScore == null) {
        return;
      }

      let winnerId: number | null = null;
      if (homeScore > awayScore) {
        winnerId = match.homeClubId ?? null;
      } else if (awayScore > homeScore) {
        winnerId = match.awayClubId ?? null;
      }

      if (winnerId != null) {
        const key = String(winnerId);
        series.winsById[key] = (series.winsById[key] ?? 0) + 1;
      }
    });
  });

  return Array.from(seriesMap.values());
}

function seriesClubIds(series: Series): number[] {
  const ids: number[] = [];
  if (series.homeClubId != null) {
    ids.push(series.homeClubId);
  }
  if (series.awayClubId != null) {
    ids.push(series.awayClubId);
  }
  return ids;
}

function getRepresentativeMatch(series: Series): Match {
  const sorted = series.matches.slice().sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')));
  return sorted[sorted.length - 1] ?? series.matches[0];
}

function findClubAcrossPhases(phases: PostseasonPhase[], clubId?: number | null) {
  if (clubId == null) {
    return undefined;
  }

  for (const phase of phases) {
    for (const match of phase.matches || []) {
      if (match.homeClubId === clubId && match.homeClub) {
        return match.homeClub;
      }

      if (match.awayClubId === clubId && match.awayClub) {
        return match.awayClub;
      }
    }
  }

  return undefined;
}

function areLayoutsEqual(left?: LayoutBox, right?: LayoutBox): boolean {
  if (!left || !right) {
    return false;
  }

  return left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
}

function toLayoutBox(event: LayoutChangeEvent): LayoutBox {
  const { x, y, width, height } = event.nativeEvent.layout;
  return { x, y, width, height };
}

function buildConnectorSegments(prefix: string, x1: number, y1: number, x2: number, y2: number): ConnectorSegment[] {
  const midX = (x1 + x2) / 2;
  const thickness = 2;

  return [
    {
      key: `${prefix}-h1`,
      left: Math.min(x1, midX),
      top: y1 - thickness / 2,
      width: Math.max(Math.abs(midX - x1), thickness),
      height: thickness,
    },
    {
      key: `${prefix}-v`,
      left: midX - thickness / 2,
      top: Math.min(y1, y2),
      width: thickness,
      height: Math.max(Math.abs(y2 - y1), thickness),
    },
    {
      key: `${prefix}-h2`,
      left: Math.min(midX, x2),
      top: y2 - thickness / 2,
      width: Math.max(Math.abs(x2 - midX), thickness),
      height: thickness,
    },
  ];
}

function computeBracketGeometry(params: {
  columnSeriesMap: Record<string, Series[]>;
  layouts: Record<string, LayoutBox>;
  relations: BracketRelation[];
  childOrder: string[];
}): { offsets: Record<string, number>; segments: ConnectorSegment[] } {
  const { columnSeriesMap, layouts, relations, childOrder } = params;
  const offsets: Record<string, number> = {};
  const segments: ConnectorSegment[] = [];

  const parentMap = relations.reduce<Record<string, BracketRelation[]>>((result, relation) => {
    const current = result[relation.childKey] ?? [];
    current.push(relation);
    result[relation.childKey] = current;
    return result;
  }, {});

  childOrder.forEach((childKey) => {
    const childColumnLayout = layouts[`column-${childKey}`];
    const childStackLayout = layouts[`stack-${childKey}`];
    const childSeriesList = columnSeriesMap[childKey] ?? [];
    const childRelations = parentMap[childKey] ?? [];

    if (!childColumnLayout || !childStackLayout || childRelations.length === 0) {
      return;
    }

    const parentIndexMapByRelation = new Map<string, Record<number, number[]>>();
    childRelations.forEach((relation) => {
      const parentSeriesList = columnSeriesMap[relation.parentKey] ?? [];
      const clubToParentIndex: Record<number, number[]> = {};
      parentSeriesList.forEach((series, index) => {
        seriesClubIds(series).forEach((clubId) => {
          if (!clubToParentIndex[clubId]) {
            clubToParentIndex[clubId] = [];
          }
          clubToParentIndex[clubId].push(index);
        });
      });
      parentIndexMapByRelation.set(relation.parentKey, clubToParentIndex);
    });

    childSeriesList.forEach((childSeries, childIndex) => {
      const childLayoutKey = `card-${childKey}-${childIndex}`;
      const childCardLayout = layouts[childLayoutKey];
      if (!childCardLayout) {
        return;
      }

      const matchedParents: Array<{
        relation: BracketRelation;
        parentIndex: number;
        parentLayoutKey: string;
        parentCenterY: number;
        parentColumnLayout: LayoutBox;
        parentStackLayout: LayoutBox;
        parentCardLayout: LayoutBox;
      }> = [];

      childRelations.forEach((relation) => {
        const parentColumnLayout = layouts[`column-${relation.parentKey}`];
        const parentStackLayout = layouts[`stack-${relation.parentKey}`];
        if (!parentColumnLayout || !parentStackLayout) {
          return;
        }

        const clubToParentIndex = parentIndexMapByRelation.get(relation.parentKey) ?? {};
        const parentIndices = Array.from(
          new Set(
            seriesClubIds(childSeries)
              .flatMap((clubId) => clubToParentIndex[clubId] ?? []),
          ),
        );

        parentIndices.forEach((parentIndex) => {
          const parentLayoutKey = `card-${relation.parentKey}-${parentIndex}`;
          const parentCardLayout = layouts[parentLayoutKey];
          if (!parentCardLayout) {
            return;
          }

          const parentOffset = offsets[parentLayoutKey] ?? 0;
          const parentCenterY =
            parentColumnLayout.y +
            parentStackLayout.y +
            parentCardLayout.y +
            parentCardLayout.height / 2 +
            parentOffset;

          matchedParents.push({
            relation,
            parentIndex,
            parentLayoutKey,
            parentCenterY,
            parentColumnLayout,
            parentStackLayout,
            parentCardLayout,
          });
        });
      });

      if (!matchedParents.length) {
        return;
      }

      const averageParentY = matchedParents.reduce((sum, parent) => sum + parent.parentCenterY, 0) / matchedParents.length;
      const childNaturalCenterY = childColumnLayout.y + childStackLayout.y + childCardLayout.y + childCardLayout.height / 2;
      const childOffset = averageParentY - childNaturalCenterY;
      offsets[childLayoutKey] = childOffset;

      matchedParents.forEach((parent) => {
        const childCenterY = childNaturalCenterY + childOffset;
        const parentRightX =
          parent.parentColumnLayout.x +
          parent.parentStackLayout.x +
          parent.parentCardLayout.x +
          parent.parentCardLayout.width;
        const parentLeftX = parent.parentColumnLayout.x + parent.parentStackLayout.x + parent.parentCardLayout.x;
        const childLeftX = childColumnLayout.x + childStackLayout.x + childCardLayout.x;
        const childRightX = childColumnLayout.x + childStackLayout.x + childCardLayout.x + childCardLayout.width;

        const x1 = parent.relation.inverted ? childRightX : parentRightX;
        const y1 = parent.relation.inverted ? childCenterY : parent.parentCenterY;
        const x2 = parent.relation.inverted ? parentLeftX : childLeftX;
        const y2 = parent.relation.inverted ? parent.parentCenterY : childCenterY;

        segments.push(
          ...buildConnectorSegments(`${parent.relation.parentKey}-${childKey}-${parent.parentIndex}-${childIndex}`, x1, y1, x2, y2),
        );
      });
    });
  });

  return { offsets, segments };
}

function computeSlotBracketGeometry(params: {
  columnSlotMap: Record<string, BracketSlot[]>;
  layouts: Record<string, LayoutBox>;
  relations: BracketRelation[];
  childOrder: string[];
}): { offsets: Record<string, number>; segments: ConnectorSegment[] } {
  const { columnSlotMap, layouts, relations, childOrder } = params;
  const offsets: Record<string, number> = {};
  const segments: ConnectorSegment[] = [];

  const parentMap = relations.reduce<Record<string, BracketRelation[]>>((result, relation) => {
    const current = result[relation.childKey] ?? [];
    current.push(relation);
    result[relation.childKey] = current;
    return result;
  }, {});

  childOrder.forEach((childKey) => {
    const childColumnLayout = layouts[`column-${childKey}`];
    const childStackLayout = layouts[`stack-${childKey}`];
    const childSlots = columnSlotMap[childKey] ?? [];
    const childRelations = parentMap[childKey] ?? [];

    if (!childColumnLayout || !childStackLayout || childRelations.length === 0) {
      return;
    }

    childSlots.forEach((childSlot, childIndex) => {
      const childLayoutKey = `slot-${childSlot.key}`;
      const childCardLayout = layouts[childLayoutKey];
      if (!childCardLayout) {
        return;
      }

      const matchedParents: Array<{
        relation: BracketRelation;
        parentSlot: BracketSlot;
        parentCenterY: number;
        parentColumnLayout: LayoutBox;
        parentStackLayout: LayoutBox;
        parentCardLayout: LayoutBox;
      }> = [];

      childRelations.forEach((relation) => {
        const parentColumnLayout = layouts[`column-${relation.parentKey}`];
        const parentStackLayout = layouts[`stack-${relation.parentKey}`];
        const parentSlots = columnSlotMap[relation.parentKey] ?? [];

        if (!parentColumnLayout || !parentStackLayout || !parentSlots.length) {
          return;
        }

        let candidates = parentSlots
          .map((slot, index) => ({ slot, index }))
          .filter(({ slot }) => slot != null);

        if (childSlot.series) {
          const childClubs = seriesClubIds(childSlot.series);
          candidates = candidates.filter(({ slot }) => slot.series && seriesClubIds(slot.series).some((clubId) => childClubs.includes(clubId)));
        } else {
          candidates = [];
        }

        if (!candidates.length) {
          candidates = [parentSlots[childIndex * 2], parentSlots[childIndex * 2 + 1]]
            .map((slot, index) => (slot ? { slot, index: childIndex * 2 + index } : null))
            .filter((entry): entry is { slot: BracketSlot; index: number } => entry != null);
        }

        candidates.forEach(({ slot }) => {
          const parentLayoutKey = `slot-${slot.key}`;
          const parentCardLayout = layouts[parentLayoutKey];
          if (!parentCardLayout) {
            return;
          }

          const parentOffset = offsets[parentLayoutKey] ?? 0;
          const parentCenterY =
            parentColumnLayout.y +
            parentStackLayout.y +
            parentCardLayout.y +
            parentCardLayout.height / 2 +
            parentOffset;

          matchedParents.push({
            relation,
            parentSlot: slot,
            parentCenterY,
            parentColumnLayout,
            parentStackLayout,
            parentCardLayout,
          });
        });
      });

      if (!matchedParents.length) {
        return;
      }

      const averageParentY = matchedParents.reduce((sum, parent) => sum + parent.parentCenterY, 0) / matchedParents.length;
      const childNaturalCenterY = childColumnLayout.y + childStackLayout.y + childCardLayout.y + childCardLayout.height / 2;
      const childOffset = averageParentY - childNaturalCenterY;
      offsets[childLayoutKey] = childOffset;

      matchedParents.forEach((parent) => {
        const childCenterY = childNaturalCenterY + childOffset;
        const parentRightX =
          parent.parentColumnLayout.x +
          parent.parentStackLayout.x +
          parent.parentCardLayout.x +
          parent.parentCardLayout.width;
        const parentLeftX = parent.parentColumnLayout.x + parent.parentStackLayout.x + parent.parentCardLayout.x;
        const childLeftX = childColumnLayout.x + childStackLayout.x + childCardLayout.x;
        const childRightX = childColumnLayout.x + childStackLayout.x + childCardLayout.x + childCardLayout.width;

        const x1 = parent.relation.inverted ? childRightX : parentRightX;
        const y1 = parent.relation.inverted ? childCenterY : parent.parentCenterY;
        const x2 = parent.relation.inverted ? parentLeftX : childLeftX;
        const y2 = parent.relation.inverted ? parent.parentCenterY : childCenterY;

        segments.push(
          ...buildConnectorSegments(`${parent.relation.parentKey}-${childKey}-${parent.parentSlot.key}-${childSlot.key}`, x1, y1, x2, y2),
        );
      });
    });
  });

  return { offsets, segments };
}

export function buildDisplayPhases(bracket?: PostseasonBracketPayload): PostseasonPhase[] {
  const payloadPhases = bracket?.phases ?? [];
  const hasPlayIns = payloadPhases.some((phase) => phase.detail === 'Play-ins' && (phase.matches?.length ?? 0) > 0);

  let earliestIndex: number | null = null;
  payloadPhases.forEach((phase) => {
    if (phase.detail === 'Play-ins') {
      return;
    }

    const index = PHASE_ORDER.indexOf(phase.detail);
    if (index >= 0 && (phase.matches?.length ?? 0) > 0 && (earliestIndex == null || index < earliestIndex)) {
      earliestIndex = index;
    }
  });

  if (earliestIndex == null) {
    payloadPhases.forEach((phase) => {
      if (phase.detail === 'Play-ins') {
        return;
      }

      const index = PHASE_ORDER.indexOf(phase.detail);
      if (index >= 0 && (earliestIndex == null || index < earliestIndex)) {
        earliestIndex = index;
      }
    }
    );
  }

  const phases: PostseasonPhase[] = [];
  if (hasPlayIns) {
    const playIns = payloadPhases.find((phase) => phase.detail === 'Play-ins');
    phases.push(playIns || { phase: 'Play-ins', detail: 'Play-ins', matches: [] });
  }

  if (earliestIndex != null) {
    const startIndex = Number(earliestIndex);
    for (let index = startIndex; index < PHASE_ORDER.length; index += 1) {
      const detail = PHASE_ORDER[index];
      if (detail === 'Play-ins') {
        continue;
      }

      const found = payloadPhases.find((phase) => phase.detail === detail);
      phases.push(found || { phase: 'Playoffs', detail, matches: [] });
    }
  }

  return phases;
}

export function getFilteredPhases(displayPhases: PostseasonPhase[], activePhase: string): PostseasonPhase[] {
  if (activePhase === 'Play-ins') {
    return displayPhases.filter((phase) => phase.phase === 'Play-ins');
  }

  if (activePhase === 'Playoffs') {
    return displayPhases.filter((phase) => phase.phase === 'Playoffs');
  }

  return displayPhases;
}

function buildClubToGroupMap(bracket?: PostseasonBracketPayload): Map<number, number> {
  const map = new Map<number, number>();

  (bracket?.regularSeasonStandings ?? []).forEach((standing) => {
    if (standing.groupId != null) {
      map.set(Number(standing.clubId), Number(standing.groupId));
    }
  });

  return map;
}

function buildSeedMap(bracket?: PostseasonBracketPayload): Map<number, number> {
  const map = new Map<number, number>();

  (bracket?.regularSeasonStandings ?? []).forEach((standing) => {
    map.set(Number(standing.clubId), Number(standing.position));
  });

  return map;
}

function buildConferenceSeedMaps(bracket?: PostseasonBracketPayload): Map<number, Map<number, number>> {
  const byGroup = new Map<number, Array<{ clubId: number; position: number }>>();

  (bracket?.regularSeasonStandings ?? []).forEach((standing) => {
    if (standing.groupId == null) {
      return;
    }

    const groupId = Number(standing.groupId);
    const entries = byGroup.get(groupId) ?? [];
    entries.push({ clubId: Number(standing.clubId), position: Number(standing.position) });
    byGroup.set(groupId, entries);
  });

  const result = new Map<number, Map<number, number>>();
  byGroup.forEach((entries, groupId) => {
    entries.sort((left, right) => left.position - right.position);
    const groupMap = new Map<number, number>();
    entries.forEach((entry, index) => {
      groupMap.set(entry.clubId, index + 1);
    });
    result.set(groupId, groupMap);
  });

  return result;
}

function getTopSeedForSeries(
  series: Series,
  getSeedForClub: (clubId?: number | null, preferredGroupId?: number | null) => number | undefined,
  preferredGroupId?: number | null,
): number | undefined {
  const seeds = seriesClubIds(series)
    .map((clubId) => getSeedForClub(clubId, preferredGroupId))
    .filter((seed): seed is number => Number.isFinite(seed));

  if (!seeds.length) {
    return undefined;
  }

  return Math.min(...seeds);
}

function buildOrderedPhaseSeries(
  phases: PostseasonPhase[],
  getSeriesGroupId: (series: Series) => number | null,
  sortFirstPhase?: (seriesList: Series[], phaseDetail: string) => Series[],
): Record<string, Series[]> {
  const orderedByPhase: Record<string, Series[]> = {};

  phases.forEach((phase, phaseIndex) => {
    const seriesList = buildSeries(phase.matches || []);
    const hasGroups = seriesList.some((series) => getSeriesGroupId(series) != null);

    let ordered: Series[];
    if (sortFirstPhase) {
      ordered = sortFirstPhase(seriesList, phase.detail);
    } else if (hasGroups) {
      const grouped = new Map<string, Series[]>();
      seriesList.forEach((series) => {
        const key = String(getSeriesGroupId(series) ?? 'nogroup');
        const entries = grouped.get(key) ?? [];
        entries.push(series);
        grouped.set(key, entries);
      });

      ordered = Array.from(grouped.entries())
        .map(([groupKey, groupSeries]) => ({
          groupKey,
          groupSeries: groupSeries.slice().sort((left, right) => left.earliestDate.localeCompare(right.earliestDate)),
          earliestDate: groupSeries.map((series) => series.earliestDate).sort()[0] ?? '',
        }))
        .sort((left, right) => left.earliestDate.localeCompare(right.earliestDate))
        .flatMap((entry) => entry.groupSeries);
    } else {
      ordered = seriesList.slice().sort((left, right) => left.earliestDate.localeCompare(right.earliestDate));
    }

    if (phaseIndex > 0) {
      const previousSeries = orderedByPhase[phases[phaseIndex - 1].detail] ?? [];
      const previousOrder: Record<number, number> = {};
      previousSeries.forEach((series, index) => {
        seriesClubIds(series).forEach((clubId) => {
          previousOrder[clubId] = index;
        });
      });

      ordered = ordered.slice().sort((left, right) => {
        const leftIndex = Math.min(...seriesClubIds(left).map((clubId) => previousOrder[clubId] ?? Number.MAX_SAFE_INTEGER));
        const rightIndex = Math.min(...seriesClubIds(right).map((clubId) => previousOrder[clubId] ?? Number.MAX_SAFE_INTEGER));

        if (leftIndex !== rightIndex) {
          return leftIndex - rightIndex;
        }

        return left.earliestDate.localeCompare(right.earliestDate);
      });
    }

    orderedByPhase[phase.detail] = ordered;
  });

  return orderedByPhase;
}

function SeriesCard(props: {
  series: Series;
  getSeedForClub: (clubId?: number | null, preferredGroupId?: number | null) => number | undefined;
  preferredGroupId?: number | null;
}) {
  const { series, getSeedForClub, preferredGroupId } = props;
  const representative = getRepresentativeMatch(series);
  const homeSeed = getSeedForClub(representative.homeClubId, preferredGroupId);
  const awaySeed = getSeedForClub(representative.awayClubId, preferredGroupId);
  const shouldFlip = homeSeed != null && awaySeed != null && awaySeed < homeSeed;
  const isSingleMatch = series.matches.length === 1;

  const top = shouldFlip
    ? {
        club: representative.awayClub,
        seed: awaySeed,
        score: representative.awayScore,
        fallbackId: representative.awayClubId,
        placeholder: representative.awayClubPlaceholder,
        wins: representative.awayClubId != null ? series.winsById[String(representative.awayClubId)] ?? 0 : 0,
      }
    : {
        club: representative.homeClub,
        seed: homeSeed,
        score: representative.homeScore,
        fallbackId: representative.homeClubId,
        placeholder: representative.homeClubPlaceholder,
        wins: representative.homeClubId != null ? series.winsById[String(representative.homeClubId)] ?? 0 : 0,
      };

  const bottom = shouldFlip
    ? {
        club: representative.homeClub,
        seed: homeSeed,
        score: representative.homeScore,
        fallbackId: representative.homeClubId,
        placeholder: representative.homeClubPlaceholder,
        wins: representative.homeClubId != null ? series.winsById[String(representative.homeClubId)] ?? 0 : 0,
      }
    : {
        club: representative.awayClub,
        seed: awaySeed,
        score: representative.awayScore,
        fallbackId: representative.awayClubId,
        placeholder: representative.awayClubPlaceholder,
        wins: representative.awayClubId != null ? series.winsById[String(representative.awayClubId)] ?? 0 : 0,
      };

  const nextGame = series.matches
    .filter((match) => match.status !== 'Finished')
    .sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')))[0] ?? null;
  const lastPlayed = series.matches
    .filter((match) => match.status === 'Finished' || (match.homeScore != null && match.awayScore != null))
    .sort((left, right) => String(right.date ?? '').localeCompare(String(left.date ?? '')))[0] ?? null;
  const footerLabel = nextGame ? 'Next game' : lastPlayed ? 'Last game' : isSingleMatch ? 'Game' : 'Series';

  return (
    <View style={styles.card}>
      {[top, bottom].map((entry, index) => (
        <View key={`${series.id}-${index}`} style={styles.teamRow}>
          <Text style={styles.teamLabel} numberOfLines={1}>
            {getClubDisplayWithSeed(entry.club, entry.fallbackId, entry.placeholder, entry.seed)}
          </Text>
          <Text style={styles.teamScore}>{isSingleMatch ? entry.score ?? '-' : entry.wins}</Text>
        </View>
      ))}
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>{footerLabel}</Text>
        <Text style={styles.cardMetaValue}>{formatShortDate(nextGame?.date ?? lastPlayed?.date ?? representative.date)}</Text>
      </View>
    </View>
  );
}

function PlaceholderCard() {
  return (
    <View style={[styles.card, styles.placeholderCard]}>
      <View style={styles.teamRow}>
        <Text style={styles.placeholderText}>TBD</Text>
        <Text style={styles.placeholderText}>-</Text>
      </View>
      <View style={styles.teamRow}>
        <Text style={styles.placeholderText}>TBD</Text>
        <Text style={styles.placeholderText}>-</Text>
      </View>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardMetaLabel}>-</Text>
        <Text style={styles.cardMetaValue}>-</Text>
      </View>
    </View>
  );
}

function PhaseColumn(props: {
  eyebrow?: string;
  title: string;
  active?: boolean;
  onColumnLayout?: (event: LayoutChangeEvent) => void;
  onStackLayout?: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.phaseColumn} onLayout={props.onColumnLayout}>
      <View style={[styles.phaseHeader, props.active ? styles.phaseHeaderActive : null]}>
        {props.eyebrow ? <Text style={styles.phaseEyebrow}>{props.eyebrow}</Text> : null}
        <Text style={styles.phaseTitle}>{props.title}</Text>
      </View>
      <View style={styles.phaseCardStack} onLayout={props.onStackLayout}>{props.children}</View>
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

function GenericBracket(props: {
  filteredPhases: PostseasonPhase[];
  activePhaseDetail: string;
  sportKey?: string;
  seedMap: Map<number, number>;
  clubToGroup: Map<number, number>;
  groupLabelMap?: Record<number, string>;
}) {
  const { filteredPhases, activePhaseDetail, sportKey, seedMap, clubToGroup, groupLabelMap } = props;

  const orderedPhaseSeries = React.useMemo(() => {
    return buildOrderedPhaseSeries(filteredPhases, (series) => {
      if (series.groupId != null) {
        return Number(series.groupId);
      }

      const clubId = seriesClubIds(series)[0];
      return clubId != null ? clubToGroup.get(clubId) ?? null : null;
    });
  }, [clubToGroup, filteredPhases]);

  const phaseRenderData = React.useMemo(
    () => filteredPhases.map((phase) => {
      let seriesList = orderedPhaseSeries[phase.detail] ?? [];
      let perMatchMode = false;

      if (sportKey !== 'basketball' && phase.phase === 'Playoffs') {
        const allMatches = (phase.matches || []).slice().sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')));
        if (allMatches.length > seriesList.length) {
          perMatchMode = true;
          seriesList = buildSeries(allMatches)
            .map((series) => ({
              ...series,
              matches: series.matches.slice().sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? ''))),
              earliestDate: series.matches.slice().sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')))[0]?.date ?? series.earliestDate,
            }))
            .sort((left, right) => left.earliestDate.localeCompare(right.earliestDate));
        }
      }

      const expected = perMatchMode ? undefined : PHASE_SLOT_COUNTS[phase.detail];
      const placeholders = expected && expected > seriesList.length ? expected - seriesList.length : 0;

      return {
        phase,
        seriesList,
        perMatchMode,
        placeholders,
      };
    }),
    [filteredPhases, orderedPhaseSeries, sportKey],
  );

  const [playoffLayouts, setPlayoffLayouts] = React.useState<Record<string, LayoutBox>>({});

  const updateLayout = React.useCallback((key: string, nextLayout: LayoutBox) => {
    setPlayoffLayouts((current) => {
      if (areLayoutsEqual(current[key], nextLayout)) {
        return current;
      }

      return {
        ...current,
        [key]: nextLayout,
      };
    });
  }, []);

  const relations = React.useMemo<BracketRelation[]>(
    () => phaseRenderData.slice(1).map((entry, index) => ({
      parentKey: phaseRenderData[index].phase.detail,
      childKey: entry.phase.detail,
    })),
    [phaseRenderData],
  );

  const geometry = React.useMemo(
    () => computeBracketGeometry({
      columnSeriesMap: phaseRenderData.reduce<Record<string, Series[]>>((result, entry) => {
        result[entry.phase.detail] = entry.seriesList;
        return result;
      }, {}),
      layouts: playoffLayouts,
      relations,
      childOrder: phaseRenderData.slice(1).map((entry) => entry.phase.detail),
    }),
    [phaseRenderData, playoffLayouts, relations],
  );

  const getSeedForClub = React.useCallback(
    (clubId?: number | null) => {
      if (clubId == null) {
        return undefined;
      }
      return seedMap.get(Number(clubId));
    },
    [seedMap],
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScrollContent}>
      <View style={styles.bracketCanvas}>
        <View pointerEvents="none" style={styles.connectorOverlay}>
          {geometry.segments.map((segment) => (
            <View
              key={segment.key}
              style={[
                styles.connectorSegment,
                {
                  left: segment.left,
                  top: segment.top,
                  width: segment.width,
                  height: segment.height,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.bracketColumnsRow}>
          {phaseRenderData.map((entry) => (
            <PhaseColumn
              key={entry.phase.detail}
              eyebrow={entry.phase.phase}
              title={sportKey === 'basketball' ? getNbaPhaseDisplayName(entry.phase.detail) : entry.phase.detail}
              active={entry.phase.detail === activePhaseDetail}
              onColumnLayout={(event) => updateLayout(`column-${entry.phase.detail}`, toLayoutBox(event))}
              onStackLayout={(event) => updateLayout(`stack-${entry.phase.detail}`, toLayoutBox(event))}
            >
              {entry.seriesList.map((series, index) => {
                const offset = geometry.offsets[`card-${entry.phase.detail}-${index}`] ?? 0;

                if (entry.perMatchMode && series.matches.length > 1) {
                  return (
                    <View
                      key={`${entry.phase.detail}-${series.id}-${index}`}
                      onLayout={(event) => updateLayout(`card-${entry.phase.detail}-${index}`, toLayoutBox(event))}
                      style={offset ? { transform: [{ translateY: offset }] } : undefined}
                    >
                      <View style={styles.multiLegStack}>
                        {series.matches.map((match, matchIndex) => (
                          <SeriesCard
                            key={`${entry.phase.detail}-${series.id}-${match.id}-${matchIndex}`}
                            series={{
                              id: `${series.id}-${match.id}`,
                              homeClubId: match.homeClubId,
                              awayClubId: match.awayClubId,
                              homePlaceholder: match.homeClubPlaceholder,
                              awayPlaceholder: match.awayClubPlaceholder,
                              matches: [match],
                              winsById: {},
                              groupId: match.groupId ?? null,
                              earliestDate: match.date ?? '',
                            }}
                            getSeedForClub={getSeedForClub}
                            preferredGroupId={match.groupId ?? null}
                          />
                        ))}
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={`${entry.phase.detail}-${series.id}-${index}`}
                    onLayout={(event) => updateLayout(`card-${entry.phase.detail}-${index}`, toLayoutBox(event))}
                    style={offset ? { transform: [{ translateY: offset }] } : undefined}
                  >
                    <SeriesCard
                      series={series}
                      getSeedForClub={getSeedForClub}
                      preferredGroupId={series.groupId ?? null}
                    />
                  </View>
                );
              })}
              {Array.from({ length: entry.placeholders }).map((_, index) => (
                <PlaceholderCard key={`${entry.phase.detail}-placeholder-${index}`} />
              ))}
              {!entry.seriesList.length && entry.placeholders === 0 ? <EmptyState label="No matches yet" /> : null}
            </PhaseColumn>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function NbaPlayInsBracket(props: {
  playInsPhase: PostseasonPhase;
  seedMap: Map<number, number>;
  bracket?: PostseasonBracketPayload;
  groupLabelMap?: Record<number, string>;
}) {
  const { playInsPhase, seedMap, bracket, groupLabelMap } = props;
  const clubToGroup = React.useMemo(() => buildClubToGroupMap(bracket), [bracket]);
  const conferenceSeedMaps = React.useMemo(() => buildConferenceSeedMaps(bracket), [bracket]);

  const conferenceIds = React.useMemo(() => {
    const ids = new Set<number>();
    (playInsPhase.matches || []).forEach((match) => {
      if (match.groupId != null) {
        ids.add(Number(match.groupId));
      }
      if (match.homeClubId != null) {
        const groupId = clubToGroup.get(Number(match.homeClubId));
        if (groupId != null) ids.add(groupId);
      }
      if (match.awayClubId != null) {
        const groupId = clubToGroup.get(Number(match.awayClubId));
        if (groupId != null) ids.add(groupId);
      }
    });
    return Array.from(ids).sort((left, right) => left - right);
  }, [clubToGroup, playInsPhase.matches]);

  let westConf: number | null = null;
  let eastConf: number | null = null;
  conferenceIds.forEach((groupId) => {
    const name = normalizeText(getGroupName(groupId, groupLabelMap));
    if (name.includes('west')) {
      westConf = groupId;
    } else if (name.includes('east')) {
      eastConf = groupId;
    }
  });

  if (westConf == null && conferenceIds.length > 0) {
    westConf = conferenceIds[0];
  }
  if (eastConf == null && conferenceIds.length > 1) {
    eastConf = conferenceIds[1];
  }

  const enhancedClubToGroup = React.useMemo(() => {
    const map = new Map(clubToGroup);
    (playInsPhase.matches || []).forEach((match) => {
      if (match.groupId == null) {
        return;
      }
      if (match.homeClubId != null && !map.has(Number(match.homeClubId))) {
        map.set(Number(match.homeClubId), Number(match.groupId));
      }
      if (match.awayClubId != null && !map.has(Number(match.awayClubId))) {
        map.set(Number(match.awayClubId), Number(match.groupId));
      }
    });
    return map;
  }, [clubToGroup, playInsPhase.matches]);

  const getMatchGroup = React.useCallback(
    (match: Match): number | null => {
      if (match.groupId != null) {
        return Number(match.groupId);
      }
      if (match.homeClubId != null) {
        const groupId = enhancedClubToGroup.get(Number(match.homeClubId));
        if (groupId != null) return groupId;
      }
      if (match.awayClubId != null) {
        const groupId = enhancedClubToGroup.get(Number(match.awayClubId));
        if (groupId != null) return groupId;
      }
      return null;
    },
    [enhancedClubToGroup],
  );

  const processConferenceMatches = React.useCallback(
    (groupId: number | null) => {
      if (groupId == null) {
        return { firstColumn: [] as Match[], secondColumn: [] as Match[], clubToFirstMatch: new Map<number, number>() };
      }

      const matches = (playInsPhase.matches || [])
        .filter((match) => getMatchGroup(match) === groupId)
        .slice()
        .sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')));

      const firstAppearance = new Map<number, Match>();
      const secondAppearance = new Map<number, Match>();

      matches.forEach((match) => {
        const clubIds = [match.homeClubId, match.awayClubId].filter((clubId): clubId is number => clubId != null);
        const isFirstAppearance = clubIds.every((clubId) => !firstAppearance.has(clubId));

        if (isFirstAppearance) {
          clubIds.forEach((clubId) => firstAppearance.set(clubId, match));
          return;
        }

        clubIds.forEach((clubId) => {
          if (!secondAppearance.has(clubId)) {
            secondAppearance.set(clubId, match);
          }
        });
      });

      const firstColumn = Array.from(firstAppearance.values()).filter(
        (match, index, collection) => collection.findIndex((candidate) => candidate.id === match.id) === index,
      );
      const secondColumn = Array.from(secondAppearance.values()).filter(
        (match, index, collection) => collection.findIndex((candidate) => candidate.id === match.id) === index,
      );

      const clubToFirstMatch = new Map<number, number>();
      firstColumn.forEach((match, index) => {
        [match.homeClubId, match.awayClubId].forEach((clubId) => {
          if (clubId != null) {
            clubToFirstMatch.set(Number(clubId), index);
          }
        });
      });

      return { firstColumn, secondColumn, clubToFirstMatch };
    },
    [getMatchGroup, playInsPhase.matches],
  );

  const westData = processConferenceMatches(westConf);
  const eastData = processConferenceMatches(eastConf);

  const getSeedForClub = React.useCallback(
    (clubId?: number | null, preferredGroupId?: number | null) => {
      if (clubId == null) {
        return undefined;
      }

      if (preferredGroupId != null) {
        const groupSeed = conferenceSeedMaps.get(Number(preferredGroupId))?.get(Number(clubId));
        if (groupSeed != null) {
          return groupSeed;
        }
      }

      const inferredGroupId = enhancedClubToGroup.get(Number(clubId));
      if (inferredGroupId != null) {
        const groupSeed = conferenceSeedMaps.get(inferredGroupId)?.get(Number(clubId));
        if (groupSeed != null) {
          return groupSeed;
        }
      }

      return seedMap.get(Number(clubId));
    },
    [conferenceSeedMaps, enhancedClubToGroup, seedMap],
  );

  const [playInLayouts, setPlayInLayouts] = React.useState<Record<string, LayoutBox>>({});

  const updateLayout = React.useCallback((key: string, nextLayout: LayoutBox) => {
    setPlayInLayouts((current) => {
      if (areLayoutsEqual(current[key], nextLayout)) {
        return current;
      }

      return {
        ...current,
        [key]: nextLayout,
      };
    });
  }, []);

  const buildConferenceLinks = React.useCallback(
    (
      prefix: 'west' | 'east',
      data: { firstColumn: Match[]; secondColumn: Match[]; clubToFirstMatch: Map<number, number> },
      inverted: boolean,
    ): { offsets: number[]; segments: ConnectorSegment[] } => {
      const offsets: number[] = [];
      const segments: ConnectorSegment[] = [];
      const firstColumnLayout = playInLayouts[`${prefix}-column-first`];
      const secondColumnLayout = playInLayouts[`${prefix}-column-second`];
      const firstStackLayout = playInLayouts[`${prefix}-stack-first`];
      const secondStackLayout = playInLayouts[`${prefix}-stack-second`];

      if (!firstColumnLayout || !secondColumnLayout || !firstStackLayout || !secondStackLayout) {
        return { offsets, segments };
      }

      data.secondColumn.forEach((match, secondIndex) => {
        const parentIndices = Array.from(
          new Set(
            [match.homeClubId, match.awayClubId]
              .filter((clubId): clubId is number => clubId != null)
              .map((clubId) => data.clubToFirstMatch.get(Number(clubId)))
              .filter((index): index is number => index != null),
          ),
        );

        if (!parentIndices.length) {
          return;
        }

        const childLayout = playInLayouts[`${prefix}-card-second-${secondIndex}`];
        if (!childLayout) {
          return;
        }

        const parentCenters = parentIndices
          .map((parentIndex) => {
            const parentLayout = playInLayouts[`${prefix}-card-first-${parentIndex}`];
            if (!parentLayout) {
              return null;
            }

            return firstColumnLayout.y + firstStackLayout.y + parentLayout.y + parentLayout.height / 2;
          })
          .filter((value): value is number => value != null);

        if (!parentCenters.length) {
          return;
        }

        const averageParentY = parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length;
  const childNaturalCenter = secondColumnLayout.y + secondStackLayout.y + childLayout.y + childLayout.height / 2;
        const offset = averageParentY - childNaturalCenter;
        offsets[secondIndex] = offset;

        parentIndices.forEach((parentIndex) => {
          const parentLayout = playInLayouts[`${prefix}-card-first-${parentIndex}`];
          if (!parentLayout) {
            return;
          }

          const parentCenterY = firstColumnLayout.y + firstStackLayout.y + parentLayout.y + parentLayout.height / 2;
          const childCenterY = childNaturalCenter + offset;
          const x1 = inverted
            ? secondColumnLayout.x + secondStackLayout.x + childLayout.x + childLayout.width
            : firstColumnLayout.x + firstStackLayout.x + parentLayout.x + parentLayout.width;
          const y1 = inverted ? childCenterY : parentCenterY;
          const x2 = inverted
            ? firstColumnLayout.x + firstStackLayout.x + parentLayout.x
            : secondColumnLayout.x + secondStackLayout.x + childLayout.x;
          const y2 = inverted ? parentCenterY : childCenterY;

          segments.push(
            ...buildConnectorSegments(`${prefix}-${parentIndex}-${secondIndex}`, x1, y1, x2, y2),
          );
        });
      });

      return { offsets, segments };
    },
    [playInLayouts],
  );

  const westLinks = React.useMemo(() => buildConferenceLinks('west', westData, false), [buildConferenceLinks, westData]);
  const eastLinks = React.useMemo(() => buildConferenceLinks('east', eastData, true), [buildConferenceLinks, eastData]);

  const renderPlayInCard = (
    match: Match,
    key: string,
    groupId: number | null,
    layoutKey: string,
    offset = 0,
  ) => {
    return (
      <View
        key={key}
        onLayout={(event) => updateLayout(layoutKey, toLayoutBox(event))}
        style={offset ? { transform: [{ translateY: offset }] } : undefined}
      >
        <SeriesCard
          series={{
            id: key,
            homeClubId: match.homeClubId,
            awayClubId: match.awayClubId,
            homePlaceholder: match.homeClubPlaceholder,
            awayPlaceholder: match.awayClubPlaceholder,
            matches: [match],
            winsById: {},
            groupId,
            earliestDate: match.date ?? '',
          }}
          getSeedForClub={getSeedForClub}
          preferredGroupId={groupId}
        />
      </View>
    );
  };

  const renderPlayInColumn = (props: {
    prefix: 'west' | 'east';
    roundKey: 'first' | 'second';
    title: string;
    groupId: number | null;
    matches: Match[];
    offsets?: number[];
  }) => {
    const { prefix, roundKey, title, groupId, matches, offsets = [] } = props;

    return (
      <View
        style={styles.playInColumn}
        onLayout={(event) => updateLayout(`${prefix}-column-${roundKey}`, toLayoutBox(event))}
      >
        <View style={styles.phaseHeader}>
          <Text style={styles.phaseEyebrow}>{getGroupName(groupId, groupLabelMap)}</Text>
          <Text style={styles.phaseTitle}>{title}</Text>
        </View>
        <View
          style={styles.phaseCardStack}
          onLayout={(event) => updateLayout(`${prefix}-stack-${roundKey}`, toLayoutBox(event))}
        >
          {matches.length
            ? matches.map((match, index) =>
                renderPlayInCard(
                  match,
                  `${prefix}-${roundKey}-${match.id}`,
                  groupId,
                  `${prefix}-card-${roundKey}-${index}`,
                  roundKey === 'second' ? offsets[index] ?? 0 : 0,
                ),
              )
            : <EmptyState label="No matches yet" />}
        </View>
      </View>
    );
  };

  const renderConferenceBlock = (props: {
    prefix: 'west' | 'east';
    groupId: number | null;
    firstColumn: Match[];
    secondColumn: Match[];
    secondOffsets: number[];
    segments: ConnectorSegment[];
    inverted?: boolean;
  }) => {
    const { prefix, groupId, firstColumn, secondColumn, secondOffsets, segments, inverted = false } = props;

    return (
      <View style={styles.playInConferenceBlock}>
        <View pointerEvents="none" style={styles.playInConnectorOverlay}>
          {segments.map((segment) => (
            <View
              key={`${prefix}-${segment.key}`}
              style={[
                styles.playInConnectorSegment,
                {
                  left: segment.left,
                  top: segment.top,
                  width: segment.width,
                  height: segment.height,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.playInConferenceColumns}>
          {inverted
            ? (
                <>
                  {renderPlayInColumn({
                    prefix,
                    roundKey: 'second',
                    title: 'Second Round',
                    groupId,
                    matches: secondColumn,
                    offsets: secondOffsets,
                  })}
                  {renderPlayInColumn({
                    prefix,
                    roundKey: 'first',
                    title: 'First Round',
                    groupId,
                    matches: firstColumn,
                  })}
                </>
              )
            : (
                <>
                  {renderPlayInColumn({
                    prefix,
                    roundKey: 'first',
                    title: 'First Round',
                    groupId,
                    matches: firstColumn,
                  })}
                  {renderPlayInColumn({
                    prefix,
                    roundKey: 'second',
                    title: 'Second Round',
                    groupId,
                    matches: secondColumn,
                    offsets: secondOffsets,
                  })}
                </>
              )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketRow}>
      {renderConferenceBlock({
        prefix: 'west',
        groupId: westConf,
        firstColumn: westData.firstColumn,
        secondColumn: westData.secondColumn,
        secondOffsets: westLinks.offsets,
        segments: westLinks.segments,
      })}
      {renderConferenceBlock({
        prefix: 'east',
        groupId: eastConf,
        firstColumn: eastData.firstColumn,
        secondColumn: eastData.secondColumn,
        secondOffsets: eastLinks.offsets,
        segments: eastLinks.segments,
        inverted: true,
      })}
    </ScrollView>
  );
}

function NbaPlayoffsBracket(props: {
  filteredPhases: PostseasonPhase[];
  activePhaseDetail: string;
  bracket?: PostseasonBracketPayload;
  groupLabelMap?: Record<number, string>;
}) {
  const { filteredPhases, activePhaseDetail, bracket, groupLabelMap } = props;
  const seedMap = React.useMemo(() => buildSeedMap(bracket), [bracket]);
  const clubToGroup = React.useMemo(() => buildClubToGroupMap(bracket), [bracket]);
  const conferenceSeedMaps = React.useMemo(() => buildConferenceSeedMaps(bracket), [bracket]);

  const finalsPhase = filteredPhases.find((phase) => phase.detail === 'Finals');
  const bracketPhases = filteredPhases.filter((phase) => phase.detail !== 'Finals');

  const rawGroupIds = React.useMemo(() => {
    const ids = new Set<number>();
    bracketPhases.forEach((phase) => {
      (phase.matches || []).forEach((match) => {
        if (match.groupId != null) {
          ids.add(Number(match.groupId));
        }
      });
    });

    if (!ids.size) {
      clubToGroup.forEach((groupId) => ids.add(groupId));
    }

    return Array.from(ids);
  }, [bracketPhases, clubToGroup]);

  let westConf: number | null = null;
  let eastConf: number | null = null;
  rawGroupIds.forEach((groupId) => {
    const name = normalizeText(getGroupName(groupId, groupLabelMap));
    if (name.includes('west')) {
      westConf = groupId;
    } else if (name.includes('east')) {
      eastConf = groupId;
    }
  });
  if (westConf == null && rawGroupIds.length > 0) {
    westConf = rawGroupIds[0];
  }
  if (eastConf == null && rawGroupIds.length > 1) {
    eastConf = rawGroupIds.find((groupId) => groupId !== westConf) ?? null;
  }

  const getSeedForClub = React.useCallback(
    (clubId?: number | null, preferredGroupId?: number | null) => {
      if (clubId == null) {
        return undefined;
      }

      if (preferredGroupId != null) {
        const conferenceSeed = conferenceSeedMaps.get(Number(preferredGroupId))?.get(Number(clubId));
        if (conferenceSeed != null) {
          return conferenceSeed;
        }
      }

      const inferredGroup = clubToGroup.get(Number(clubId));
      if (inferredGroup != null) {
        const conferenceSeed = conferenceSeedMaps.get(inferredGroup)?.get(Number(clubId));
        if (conferenceSeed != null) {
          return conferenceSeed;
        }
      }

      return seedMap.get(Number(clubId));
    },
    [clubToGroup, conferenceSeedMaps, seedMap],
  );

  const getSeriesConference = React.useCallback(
    (series: Series): number | null => {
      if (series.groupId != null) {
        return Number(series.groupId);
      }

      for (const clubId of seriesClubIds(series)) {
        const groupId = clubToGroup.get(Number(clubId));
        if (groupId != null) {
          return groupId;
        }
      }

      return null;
    },
    [clubToGroup],
  );

  const buildConferenceSeries = React.useCallback(
    (conferenceId: number | null) => {
      return buildOrderedPhaseSeries(
        bracketPhases,
        (series) => getSeriesConference(series),
        (seriesList, phaseDetail) => {
          const filtered = conferenceId == null
            ? seriesList
            : seriesList.filter((series) => getSeriesConference(series) === conferenceId);

          if (phaseDetail !== 'Round of 16') {
            return filtered.slice().sort((left, right) => left.earliestDate.localeCompare(right.earliestDate));
          }

          return filtered.slice().sort((left, right) => {
            const leftSeed = getTopSeedForSeries(left, getSeedForClub, conferenceId) ?? Number.MAX_SAFE_INTEGER;
            const rightSeed = getTopSeedForSeries(right, getSeedForClub, conferenceId) ?? Number.MAX_SAFE_INTEGER;
            const leftIndex = NBA_FIRST_ROUND_TOP_SEEDS.indexOf(leftSeed as (typeof NBA_FIRST_ROUND_TOP_SEEDS)[number]);
            const rightIndex = NBA_FIRST_ROUND_TOP_SEEDS.indexOf(rightSeed as (typeof NBA_FIRST_ROUND_TOP_SEEDS)[number]);
            const normalizedLeft = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
            const normalizedRight = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;

            if (normalizedLeft !== normalizedRight) {
              return normalizedLeft - normalizedRight;
            }

            return left.earliestDate.localeCompare(right.earliestDate);
          });
        },
      );
    },
    [bracketPhases, getSeedForClub, getSeriesConference],
  );

  const finalsSeries = React.useMemo(() => buildSeries(finalsPhase?.matches || []), [finalsPhase?.matches]);

  const buildConferenceSlots = React.useCallback(
    (conferenceId: number | null, sideKey: 'west' | 'east'): Record<string, BracketSlot[]> => {
      const seriesByPhase = buildConferenceSeries(conferenceId);
      const highToLow = bracketPhases.slice().reverse();
      const orderedByPhase: Record<string, Array<Series | null>> = {};

      let topDataIdx = -1;
      for (let index = 0; index < highToLow.length; index += 1) {
        const phaseDetail = highToLow[index].detail;
        if ((seriesByPhase[phaseDetail] ?? []).length > 0) {
          topDataIdx = index;
          break;
        }
      }

      if (topDataIdx === -1) {
        return bracketPhases.reduce<Record<string, BracketSlot[]>>((result, phase) => {
          const totalExpected = PHASE_SLOT_COUNTS[phase.detail];
          const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
          result[phase.detail] = Array.from({ length: expectedPerSide }, (_, index) => ({
            key: `${sideKey}-${phase.detail}-${index}`,
            series: null,
            isPlaceholder: true,
          }));
          return result;
        }, {});
      }

      for (let index = 0; index < topDataIdx; index += 1) {
        const detail = highToLow[index].detail;
        const totalExpected = PHASE_SLOT_COUNTS[detail];
        const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
        orderedByPhase[detail] = Array(expectedPerSide).fill(null);
      }

      const anchorDetail = highToLow[topDataIdx].detail;
      orderedByPhase[anchorDetail] = (seriesByPhase[anchorDetail] ?? []).slice();

      for (let index = topDataIdx + 1; index < highToLow.length; index += 1) {
        const childDetail = highToLow[index - 1].detail;
        const parentDetail = highToLow[index].detail;
        const childOrder = orderedByPhase[childDetail] ?? [];
        const parentPool = [...(seriesByPhase[parentDetail] ?? [])];
        const usedIds = new Set<string>();
        const ordered: Array<Series | null> = [];

        for (const child of childOrder) {
          if (!child) {
            ordered.push(null, null);
            continue;
          }

          const sortedClubs = seriesClubIds(child).slice().sort((left, right) => {
            const leftSeed = getSeedForClub(left, conferenceId) ?? Number.MAX_SAFE_INTEGER;
            const rightSeed = getSeedForClub(right, conferenceId) ?? Number.MAX_SAFE_INTEGER;
            return leftSeed - rightSeed;
          });

          for (let clubIndex = 0; clubIndex < 2; clubIndex += 1) {
            const clubId = sortedClubs[clubIndex];
            if (clubId == null) {
              ordered.push(null);
              continue;
            }

            const parentIndex = parentPool.findIndex(
              (series) => !usedIds.has(series.id) && seriesClubIds(series).includes(clubId),
            );

            if (parentIndex >= 0) {
              usedIds.add(parentPool[parentIndex].id);
              ordered.push(parentPool[parentIndex]);
            } else {
              ordered.push(null);
            }
          }
        }

        const totalExpected = PHASE_SLOT_COUNTS[parentDetail];
        const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : ordered.length;
        while (ordered.length < expectedPerSide) {
          ordered.push(null);
        }

        orderedByPhase[parentDetail] = ordered;
      }

      for (let phaseIndex = 0; phaseIndex < bracketPhases.length - 1; phaseIndex += 1) {
        const currentDetail = bracketPhases[phaseIndex].detail;
        const nextDetail = bracketPhases[phaseIndex + 1].detail;
        const currentSeries = orderedByPhase[currentDetail] ?? [];
        const nextSeries = [...(orderedByPhase[nextDetail] ?? [])];

        for (let childIndex = 0; childIndex < currentSeries.length; childIndex += 1) {
          const child = currentSeries[childIndex];
          if (!child || String(child.id).startsWith('prop:')) {
            continue;
          }

          const winnerEntry = Object.entries(child.winsById || {}).find(([, wins]) => (wins || 0) >= 4);
          if (!winnerEntry) {
            continue;
          }

          const winnerId = Number(winnerEntry[0]);
          const parentIndex = Math.floor(childIndex / 2);
          while (nextSeries.length <= parentIndex) {
            nextSeries.push(null);
          }

          if (nextSeries[parentIndex] != null) {
            continue;
          }

          const leftChild = currentSeries[parentIndex * 2] ?? null;
          const rightChild = currentSeries[parentIndex * 2 + 1] ?? null;
          const leftClub = leftChild ? seriesClubIds(leftChild)[0] : undefined;
          const rightClub = rightChild ? seriesClubIds(rightChild)[0] : undefined;
          const representativeSource = leftChild && seriesClubIds(leftChild).includes(winnerId)
            ? leftChild
            : rightChild && seriesClubIds(rightChild).includes(winnerId)
            ? rightChild
            : child;
          const sortedMatches = representativeSource.matches
            .slice()
            .sort((left, right) => String(left.date ?? '').localeCompare(String(right.date ?? '')));
          const representative = sortedMatches[sortedMatches.length - 1] ?? null;

          const syntheticMatch: Match = {
            id: -(phaseIndex * 100 + parentIndex + 1),
            sportId: representative?.sportId ?? bracket?.season?.sportId ?? 0,
            leagueId: representative?.leagueId ?? bracket?.season?.leagueId ?? 0,
            seasonId: representative?.seasonId ?? bracket?.season?.id ?? 0,
            homeClubId: leftClub ?? representative?.homeClubId ?? null,
            awayClubId: rightClub ?? representative?.awayClubId ?? null,
            homeClub: representative?.homeClubId === leftClub ? representative.homeClub : findClubAcrossPhases(filteredPhases, leftClub) ?? null,
            awayClub: representative?.awayClubId === rightClub ? representative.awayClub : findClubAcrossPhases(filteredPhases, rightClub) ?? null,
            homeClubPlaceholder: leftClub && leftClub !== winnerId ? 'TBD' : undefined,
            awayClubPlaceholder: rightClub && rightClub !== winnerId ? 'TBD' : undefined,
            date: representative?.date ?? null,
            status: 'Scheduled',
            groupId: conferenceId,
          };

          nextSeries[parentIndex] = {
            id: `prop:${nextDetail}:${parentIndex}`,
            homeClubId: syntheticMatch.homeClubId,
            awayClubId: syntheticMatch.awayClubId,
            homePlaceholder: syntheticMatch.homeClubPlaceholder ?? null,
            awayPlaceholder: syntheticMatch.awayClubPlaceholder ?? null,
            matches: [syntheticMatch],
            winsById: { [String(winnerId)]: child.winsById[String(winnerId)] ?? 4 },
            groupId: conferenceId ?? child.groupId ?? null,
            earliestDate: child.earliestDate,
          };
        }

        orderedByPhase[nextDetail] = nextSeries;
      }

      return bracketPhases.reduce<Record<string, BracketSlot[]>>((result, phase) => {
        const totalExpected = PHASE_SLOT_COUNTS[phase.detail];
        const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
        const slots: BracketSlot[] = [];

        if (phase.detail === 'Round of 16') {
          const pool = (orderedByPhase[phase.detail] ?? []).slice();
          const used = new Set<string>();
          const preferredSlotByTopSeed = new Map<number, number>([
            [1, 0],
            [4, 1],
            [3, 2],
            [2, 3],
          ]);

          const poolSorted = pool
            .slice()
            .filter((series): series is Series => series != null)
            .sort((left, right) => {
              const leftTopSeed = getTopSeedForSeries(left, getSeedForClub, conferenceId);
              const rightTopSeed = getTopSeedForSeries(right, getSeedForClub, conferenceId);
              const leftSlot = preferredSlotByTopSeed.get(leftTopSeed ?? -1) ?? Number.MAX_SAFE_INTEGER;
              const rightSlot = preferredSlotByTopSeed.get(rightTopSeed ?? -1) ?? Number.MAX_SAFE_INTEGER;

              if (leftSlot !== rightSlot) {
                return leftSlot - rightSlot;
              }

              const normalizedLeft = leftTopSeed ?? Number.MAX_SAFE_INTEGER;
              const normalizedRight = rightTopSeed ?? Number.MAX_SAFE_INTEGER;
              if (normalizedLeft !== normalizedRight) {
                return normalizedLeft - normalizedRight;
              }

              return left.earliestDate.localeCompare(right.earliestDate);
            });

          for (let slotIndex = 0; slotIndex < expectedPerSide; slotIndex += 1) {
            let found: Series | null = null;
            const desiredTopSeed = NBA_FIRST_ROUND_TOP_SEEDS[slotIndex];
            const exactIndex = pool.findIndex(
              (series) => series != null && !used.has(series.id) && getTopSeedForSeries(series, getSeedForClub, conferenceId) === desiredTopSeed,
            );

            if (exactIndex >= 0) {
              found = pool[exactIndex] ?? null;
              if (found) {
                used.add(found.id);
              }
            }

            if (!found) {
              const fallback = poolSorted.find((series) => !used.has(series.id)) ?? null;
              if (fallback) {
                found = fallback;
                used.add(fallback.id);
              }
            }

            slots.push({
              key: `${sideKey}-${phase.detail}-${slotIndex}`,
              series: found,
              isPlaceholder: found == null,
            });
          }

          result[phase.detail] = slots;
          return result;
        }

        const ordered = orderedByPhase[phase.detail] ?? [];
        const maxCount = expectedPerSide || ordered.length;
        for (let index = 0; index < Math.max(ordered.length, maxCount); index += 1) {
          const series = ordered[index] ?? null;
          slots.push({
            key: `${sideKey}-${phase.detail}-${index}`,
            series,
            isPlaceholder: series == null,
          });
        }

        result[phase.detail] = slots;
        return result;
      }, {});
    },
    [bracketPhases, buildConferenceSeries, filteredPhases, getSeedForClub],
  );

  const westSlotsByPhase = React.useMemo(() => buildConferenceSlots(westConf, 'west'), [buildConferenceSlots, westConf]);
  const eastSlotsByPhase = React.useMemo(() => buildConferenceSlots(eastConf, 'east'), [buildConferenceSlots, eastConf]);

  const inferredPostseasonSeedMaps = React.useMemo(() => {
    const byConference = new Map<number, Map<number, number>>();

    const assignSeedsForConference = (conferenceId: number | null, slots: BracketSlot[]) => {
      if (conferenceId == null || !slots.length) {
        return;
      }

      const conferenceMap = new Map<number, number>();
      slots.forEach((slot, index) => {
        const pair = NBA_FIRST_ROUND_SLOT_SEED_PAIRS[index];
        if (!pair || !slot.series) {
          return;
        }

        const clubs = seriesClubIds(slot.series)
          .map((clubId) => ({
            clubId,
            rawSeed: getSeedForClub(clubId, conferenceId) ?? Number.MAX_SAFE_INTEGER,
          }))
          .sort((left, right) => left.rawSeed - right.rawSeed || left.clubId - right.clubId);

        if (clubs[0]) {
          conferenceMap.set(clubs[0].clubId, pair[0]);
        }

        if (clubs[1]) {
          conferenceMap.set(clubs[1].clubId, pair[1]);
        }
      });

      byConference.set(conferenceId, conferenceMap);
    };

    assignSeedsForConference(westConf, westSlotsByPhase['Round of 16'] ?? []);
    assignSeedsForConference(eastConf, eastSlotsByPhase['Round of 16'] ?? []);

    return byConference;
  }, [eastConf, eastSlotsByPhase, getSeedForClub, westConf, westSlotsByPhase]);

  const getDisplaySeedForClub = React.useCallback(
    (clubId?: number | null, preferredGroupId?: number | null) => {
      if (clubId == null) {
        return undefined;
      }

      if (preferredGroupId != null) {
        const preferredSeed = inferredPostseasonSeedMaps.get(preferredGroupId)?.get(clubId);
        if (preferredSeed != null) {
          return preferredSeed;
        }
      }

      for (const seedMapForConference of inferredPostseasonSeedMaps.values()) {
        const inferredSeed = seedMapForConference.get(clubId);
        if (inferredSeed != null) {
          return inferredSeed;
        }
      }

      return getSeedForClub(clubId, preferredGroupId);
    },
    [getSeedForClub, inferredPostseasonSeedMaps],
  );

  const finalSlot = React.useMemo<BracketSlot>(
    () => finalsSeries[0]
      ? { key: 'finals-0', series: finalsSeries[0], isPlaceholder: false }
      : { key: 'finals-0', series: null, isPlaceholder: true },
    [finalsSeries],
  );

  const westColumns = React.useMemo(
    () => bracketPhases.map((phase) => {
      const expected = PHASE_SLOT_COUNTS[phase.detail];
      return {
        key: `west-${phase.detail}`,
        eyebrow: getGroupName(westConf, groupLabelMap),
        title: getNbaPhaseDisplayName(phase.detail),
        active: phase.detail === activePhaseDetail,
        preferredGroupId: westConf,
        slots: westSlotsByPhase[phase.detail] ?? Array.from({ length: expected ? Math.max(0, expected / 2) : 0 }, (_, index) => ({
          key: `west-${phase.detail}-${index}`,
          series: null,
          isPlaceholder: true,
        })),
      };
    }),
    [activePhaseDetail, bracketPhases, groupLabelMap, westConf, westSlotsByPhase],
  );

  const eastColumns = React.useMemo(
    () => bracketPhases.slice().reverse().map((phase) => {
      const expected = PHASE_SLOT_COUNTS[phase.detail];
      return {
        key: `east-${phase.detail}`,
        eyebrow: getGroupName(eastConf, groupLabelMap),
        title: getNbaPhaseDisplayName(phase.detail),
        active: phase.detail === activePhaseDetail,
        preferredGroupId: eastConf,
        slots: eastSlotsByPhase[phase.detail] ?? Array.from({ length: expected ? Math.max(0, expected / 2) : 0 }, (_, index) => ({
          key: `east-${phase.detail}-${index}`,
          series: null,
          isPlaceholder: true,
        })),
      };
    }),
    [activePhaseDetail, bracketPhases, eastConf, eastSlotsByPhase, groupLabelMap],
  );

  const finalsColumn = React.useMemo(
    () => finalsPhase
      ? {
          key: 'finals',
          eyebrow: 'Playoffs',
          title: 'Finals',
          active: activePhaseDetail === 'Finals',
          preferredGroupId: null,
          slots: [finalSlot],
        }
      : null,
    [activePhaseDetail, finalSlot, finalsPhase],
  );

  const displayColumns = React.useMemo(
    () => finalsColumn ? [...westColumns, finalsColumn, ...eastColumns] : [...westColumns, ...eastColumns],
    [eastColumns, finalsColumn, westColumns],
  );

  const relations = React.useMemo<BracketRelation[]>(() => {
    const nextRelations: BracketRelation[] = [];

    for (let index = 1; index < westColumns.length; index += 1) {
      nextRelations.push({
        parentKey: westColumns[index - 1].key,
        childKey: westColumns[index].key,
      });
    }

    for (let index = eastColumns.length - 1; index > 0; index -= 1) {
      nextRelations.push({
        parentKey: eastColumns[index].key,
        childKey: eastColumns[index - 1].key,
        inverted: true,
      });
    }

    if (finalsColumn) {
      if (westColumns.length) {
        nextRelations.push({
          parentKey: westColumns[westColumns.length - 1].key,
          childKey: finalsColumn.key,
        });
      }

      if (eastColumns.length) {
        nextRelations.push({
          parentKey: eastColumns[0].key,
          childKey: finalsColumn.key,
          inverted: true,
        });
      }
    }

    return nextRelations;
  }, [eastColumns, finalsColumn, westColumns]);

  const childOrder = React.useMemo(
    () => [
      ...westColumns.slice(1).map((column) => column.key),
      ...eastColumns.slice(0, -1).reverse().map((column) => column.key),
      ...(finalsColumn ? [finalsColumn.key] : []),
    ],
    [eastColumns, finalsColumn, westColumns],
  );

  const [playoffLayouts, setPlayoffLayouts] = React.useState<Record<string, LayoutBox>>({});

  const updateLayout = React.useCallback((key: string, nextLayout: LayoutBox) => {
    setPlayoffLayouts((current) => {
      if (areLayoutsEqual(current[key], nextLayout)) {
        return current;
      }

      return {
        ...current,
        [key]: nextLayout,
      };
    });
  }, []);

  const geometry = React.useMemo(
    () => computeSlotBracketGeometry({
      columnSlotMap: displayColumns.reduce<Record<string, BracketSlot[]>>((result, column) => {
        result[column.key] = column.slots;
        return result;
      }, {}),
      layouts: playoffLayouts,
      relations,
      childOrder,
    }),
    [childOrder, displayColumns, playoffLayouts, relations],
  );

  if (westConf == null || eastConf == null) {
    return (
      <GenericBracket
        filteredPhases={filteredPhases}
        activePhaseDetail={activePhaseDetail}
        sportKey="basketball"
        seedMap={seedMap}
        clubToGroup={clubToGroup}
        groupLabelMap={groupLabelMap}
      />
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScrollContent}>
      <View style={styles.bracketCanvas}>
        <View pointerEvents="none" style={styles.connectorOverlay}>
          {geometry.segments.map((segment) => (
            <View
              key={segment.key}
              style={[
                styles.connectorSegment,
                {
                  left: segment.left,
                  top: segment.top,
                  width: segment.width,
                  height: segment.height,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.bracketColumnsRow}>
          {displayColumns.map((column) => (
            <PhaseColumn
              key={column.key}
              eyebrow={column.eyebrow}
              title={column.title}
              active={column.active}
              onColumnLayout={(event) => updateLayout(`column-${column.key}`, toLayoutBox(event))}
              onStackLayout={(event) => updateLayout(`stack-${column.key}`, toLayoutBox(event))}
            >
              {column.slots.map((slot) => {
                const layoutKey = `slot-${slot.key}`;
                const offset = geometry.offsets[layoutKey] ?? 0;

                return (
                  <View
                    key={slot.key}
                    onLayout={(event) => updateLayout(layoutKey, toLayoutBox(event))}
                    style={offset ? { transform: [{ translateY: offset }] } : undefined}
                  >
                    {slot.isPlaceholder || !slot.series ? (
                      <PlaceholderCard />
                    ) : (
                      <SeriesCard
                        series={slot.series}
                        getSeedForClub={getDisplaySeedForClub}
                        preferredGroupId={column.preferredGroupId}
                      />
                    )}
                  </View>
                );
              })}
              {!column.slots.length ? <EmptyState label="No matches yet" /> : null}
            </PhaseColumn>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function PostseasonBracket(props: Props) {
  const { bracket, activePhase, activePhaseDetail, sportKey, groupLabelMap } = props;
  const displayPhases = React.useMemo(() => buildDisplayPhases(bracket), [bracket]);
  const filteredPhases = React.useMemo(() => getFilteredPhases(displayPhases, activePhase), [activePhase, displayPhases]);
  const seedMap = React.useMemo(() => buildSeedMap(bracket), [bracket]);
  const clubToGroup = React.useMemo(() => buildClubToGroupMap(bracket), [bracket]);

  if (!filteredPhases.length) {
    return <EmptyState label={`No ${activePhase.toLowerCase()} matches are available for this selection.`} />;
  }

  if (sportKey === 'basketball' && activePhase === 'Play-ins') {
    const playInsPhase = filteredPhases.find((phase) => phase.phase === 'Play-ins');
    if (playInsPhase) {
      return (
        <NbaPlayInsBracket
          playInsPhase={playInsPhase}
          seedMap={seedMap}
          bracket={bracket}
          groupLabelMap={groupLabelMap}
        />
      );
    }
  }

  if (sportKey === 'basketball' && activePhase === 'Playoffs') {
    return (
      <NbaPlayoffsBracket
        filteredPhases={filteredPhases}
        activePhaseDetail={activePhaseDetail}
        bracket={bracket}
        groupLabelMap={groupLabelMap}
      />
    );
  }

  return (
    <GenericBracket
      filteredPhases={filteredPhases}
      activePhaseDetail={activePhaseDetail}
      sportKey={sportKey}
      seedMap={seedMap}
      clubToGroup={clubToGroup}
      groupLabelMap={groupLabelMap}
    />
  );
}

const styles = StyleSheet.create({
  bracketRow: {
    gap: 14,
    paddingRight: 12,
  },
  bracketScrollContent: {
    paddingRight: 12,
  },
  bracketCanvas: {
    position: 'relative',
  },
  bracketColumnsRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  connectorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  connectorSegment: {
    position: 'absolute',
    backgroundColor: '#cbd5e1',
  },
  playInConferenceBlock: {
    width: 470,
    position: 'relative',
  },
  playInConferenceColumns: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  playInColumn: {
    width: 224,
    gap: 10,
  },
  playInConnectorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  playInConnectorSegment: {
    position: 'absolute',
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
  },
  phaseColumn: {
    width: 224,
    gap: 10,
  },
  phaseHeader: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f2eadb',
    borderWidth: 1,
    borderColor: '#e1d4bb',
    gap: 2,
  },
  phaseHeaderActive: {
    backgroundColor: '#e7efff',
    borderColor: '#8ba7e8',
  },
  phaseEyebrow: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  phaseTitle: {
    color: '#1e2a39',
    fontSize: 16,
    fontWeight: '800',
  },
  phaseCardStack: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4d9c3',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    backgroundColor: '#f8f3e8',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  teamLabel: {
    flex: 1,
    color: '#1e2a39',
    fontSize: 13,
    fontWeight: '700',
  },
  teamScore: {
    minWidth: 20,
    color: '#12355b',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  cardMetaLabel: {
    color: '#7c8a99',
    fontSize: 11,
    fontWeight: '600',
  },
  cardMetaValue: {
    color: '#657486',
    fontSize: 11,
  },
  placeholderText: {
    color: '#9aa6b2',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    borderRadius: 16,
    backgroundColor: '#fbf7ef',
    borderWidth: 1,
    borderColor: '#e4d9c3',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  emptyStateText: {
    color: '#657486',
    fontSize: 13,
  },
  multiLegStack: {
    gap: 8,
  },
});