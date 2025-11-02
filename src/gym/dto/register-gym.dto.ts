import { IsNotEmpty, IsNumberString, IsString, Length } from "class-validator";




export class RegisterGymDto {
    @IsString()
    @IsNotEmpty()
    gymId: string;


    @IsNotEmpty()
    @IsNumberString()
    @Length(6, 6)
    pin: string;
}