export declare enum MatchEventType {
    GOAL = "goal",
    OWN_GOAL = "own_goal",
    ASSIST = "assist",
    YELLOW_CARD = "yellow_card",
    RED_CARD = "red_card",
    SUBSTITUTION = "substitution",
    INJURY = "injury",
    TIMEOUT = "timeout",
    POINT = "point",
    SET_WIN = "set_win",
    FOUL = "foul",
    PENALTY = "penalty"
}
export declare class CreateMatchEventDto {
    matchId: number;
    clubId: number;
    eventType: string;
    playerId?: number;
    minute?: number;
    description?: string;
}
export declare class UpdateMatchEventDto {
    eventType?: string;
    clubId?: number;
    playerId?: number;
    minute?: number;
    description?: string;
}
export declare class MatchEventResponseDto {
    id: number;
    matchId: number;
    clubId: number;
    eventType: string;
    playerId?: number;
    minute?: number;
    description?: string;
    createdAt?: Date;
}
