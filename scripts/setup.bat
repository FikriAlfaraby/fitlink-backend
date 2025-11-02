@echo off
echo 🚀 Setting up Fitlink Backend...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📄 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update .env file with your Supabase credentials
) else (
    echo ✅ .env file already exists
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your Supabase credentials
echo 2. Run your database migrations in Supabase
echo 3. Start the development server: npm run start:dev
echo.
echo 📚 API Documentation will be available at: http://localhost:3001/api/v1/docs
echo.
pause
