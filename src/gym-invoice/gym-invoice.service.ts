import { PrismaService } from '@/database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as htmlPdf from 'html-pdf-node';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GymInvoiceService {

    constructor(private readonly prisma: PrismaService) { }

    async getGymInvoicePdf(gymId: string, month?: string, year?: string): Promise<Buffer> {
        // Set default month and year to current if not provided
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1; // Month is 1-indexed in DB
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();

        // Fetch gym details
        const gym = await this.prisma.gym.findUnique({
            where: { id: gymId },
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                code: true
            }
        });

        if (!gym) {
            throw new NotFoundException('Gym not found');
        }

        // Fetch all gym invoices for the specified period
        const gymInvoices = await this.prisma.gymInvoice.findMany({
            where: {
                gymId: gymId,
                month: targetMonth,
                year: targetYear
            },
            include: {
                posTransaction: {
                    select: {
                        id: true,
                        timestamp: true,
                        total: true,
                        paymentMethod: true,
                        member: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        name: true,
                                        phone: true,
                                        email: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                transactionDate: 'asc'
            }
        });

        // Calculate totals
        const totalAmount = gymInvoices.reduce((sum, invoice) => sum + invoice.fee, 0);
        const totalTransactions = gymInvoices.length;

        // Fetch active members for this gym
        const activeMembers = await this.prisma.member.findMany({
            where: {
                gymId: gymId,
                membershipStatus: 'active'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: {
                joinDate: 'desc'
            }
        });

        // Format invoice items HTML
        const invoiceItemsHtml = gymInvoices.map(invoice => {
            const date = new Date(invoice.transactionDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const transactionId = invoice.transactionId || 'N/A';
            const amount = this.formatCurrency(invoice.fee);
            const memberName = invoice.posTransaction?.member?.user?.name || 'N/A';

            return `
                <tr>
                    <td>${date}</td>
                    <td>${transactionId.substring(0, 8)}...</td>
                    <td>${memberName}</td>
                    <td>Gym Service Fee</td>
                    <td class="text-right">${amount}</td>
                </tr>
            `;
        }).join('');

        // If no invoices found, show a message
        const invoiceRows = invoiceItemsHtml || `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #999;">
                    No transactions found for this period
                </td>
            </tr>
        `;

        // Format member list HTML
        const memberListHtml = activeMembers.map((member, index) => {
            const joinDate = new Date(member.joinDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const expiryDate = member.membershipExpiry 
                ? new Date(member.membershipExpiry).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })
                : 'N/A';
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${member.user?.name || 'N/A'}</td>
                    <td>${member.user?.email || 'N/A'}</td>
                    <td>${member.user?.phone || 'N/A'}</td>
                    <td>${member.membershipType || 'N/A'}</td>
                    <td>${joinDate}</td>
                    <td>${expiryDate}</td>
                </tr>
            `;
        }).join('');

        const memberRows = memberListHtml || `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #999;">
                    No active members found
                </td>
            </tr>
        `;

        // Format month name
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const invoicePeriod = `${monthNames[targetMonth - 1]} ${targetYear}`;

        // Read HTML template from root project folder
        const templatePath = path.join(process.cwd(), 'templates', 'invoice-template.html');
        let htmlTemplate = fs.readFileSync(templatePath, 'utf-8');

        // Replace placeholders with actual data
        htmlTemplate = htmlTemplate
            .replace(/{{gymName}}/g, gym.name)
            .replace(/{{gymAddress}}/g, gym.address || 'N/A')
            .replace(/{{gymPhone}}/g, gym.phone || 'N/A')
            .replace(/{{gymEmail}}/g, gym.email || 'N/A')
            .replace(/{{gymId}}/g, gym.id)
            .replace(/{{gymCode}}/g, gym.code || 'N/A')
            .replace(/{{invoicePeriod}}/g, invoicePeriod)
            .replace(/{{generatedDate}}/g, new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }))
            .replace(/{{totalTransactions}}/g, totalTransactions.toString())
            .replace(/{{totalMembers}}/g, activeMembers.length.toString())
            .replace(/{{invoiceItems}}/g, invoiceRows)
            .replace(/{{memberList}}/g, memberRows)
            .replace(/{{subtotal}}/g, this.formatCurrency(totalAmount))
            .replace(/{{tax}}/g, this.formatCurrency(0))
            .replace(/{{total}}/g, this.formatCurrency(totalAmount));

        // Generate PDF using html-pdf-node
        try {
            const options = {
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };

            const file = { content: htmlTemplate };
            const pdfBuffer = await htmlPdf.generatePdf(file, options) as unknown as Buffer;
            
            return pdfBuffer;
        } catch (error) {
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }
}
