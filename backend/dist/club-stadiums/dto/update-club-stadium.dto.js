"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClubStadiumDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_club_stadium_dto_1 = require("./create-club-stadium.dto");
class UpdateClubStadiumDto extends (0, mapped_types_1.PartialType)(create_club_stadium_dto_1.CreateClubStadiumDto) {
}
exports.UpdateClubStadiumDto = UpdateClubStadiumDto;
//# sourceMappingURL=update-club-stadium.dto.js.map