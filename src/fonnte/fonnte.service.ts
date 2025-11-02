import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FonnteService {

    constructor(
        private readonly configService: ConfigService
    ) {}

    async sendOtp(phone: string, purpose: 'registration' | 'login' | 'password_reset' | 'phone_verification', otp: string) {
        const apiKey = this.configService.get<string>('FONNTE_API_KEY');
        const apiUrl = this.configService.get<string>('FONNTE_API_URL');
        let purposeText = ''
        switch (purpose) {
            case 'registration':
                purposeText = 'registrasi'
                break;
            case 'login':
                purposeText = 'login'
                break;
            case 'password_reset':
                purposeText = 'reset password'
                break;
            case 'phone_verification':
                purposeText = 'verifikasi'
                break;
        }

        const url = `${apiUrl}/send`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target: phone,
                message: `Jangan Bagikan kode ini ke siapa pun! Kode OTP ini untuk ${purposeText} dari FitLink: ${otp}`,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send OTP');
        }
    }
}
