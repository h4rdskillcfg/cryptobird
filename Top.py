import json
import os
from datetime import datetime
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    ContextTypes,
    filters
)

# ==========================
# ВСТАВЬ СЮДА НОВЫЙ ТОКЕН
# ==========================

BOT_TOKEN = "1234567890:AAExampleFakeToken_ReplaceMe"


DB_FILE = "database.json"


# ==========================
# БАЗА
# ==========================

def load_db():
    if not os.path.exists(DB_FILE):
        return {
            "reports": [],
            "calculations": []
        }

    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


db = load_db()


# ==========================
# МЕНЮ
# ==========================

menu = [
    ["📊 Отчет", "🧮 Калькулятор"],
    ["📈 Статистика", "🏆 Рейтинг"],
    ["📂 История расчетов"]
]


def keyboard():
    return ReplyKeyboardMarkup(
        menu,
        resize_keyboard=True
    )


# ==========================
# START
# ==========================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):

    await update.message.reply_text(
        "🤖 Бот отдела продаж выставочных стендов\n\n"
        "Выберите действие:",
        reply_markup=keyboard()
    )


# ==========================
# ОТЧЕТ
# ==========================

REPORT = range(1)


async def report_start(update, context):

    context.user_data["report"] = {}

    await update.message.reply_text(
        "Введите количество полученных ТЗ:"
    )

    return REPORT


async def report_step(update, context):

    data = context.user_data["report"]

    if "received" not in data:
        data["received"] = int(update.message.text)
        await update.message.reply_text(
            "Сколько ТЗ заполнено?"
        )

    elif "filled" not in data:
        data["filled"] = int(update.message.text)
        await update.message.reply_text(
            "Сколько ТЗ выгружено в ДО?"
        )

    elif "do" not in data:
        data["do"] = int(update.message.text)
        await update.message.reply_text(
            "Сколько ТЗ не заполнено?"
        )

    elif "empty" not in data:
        data["empty"] = int(update.message.text)
        await update.message.reply_text(
            "Сколько просчетов получили?"
        )

    else:

        data["calc"] = int(update.message.text)

        report = {
            "manager": update.effective_user.first_name,
            "date": str(datetime.now()),
            **data
        }

        db["reports"].append(report)
        save_db(db)

        await update.message.reply_text(
            "✅ Отчет сохранен\n\n"
            f"👤 {report['manager']}\n"
            f"📥 ТЗ: {data['received']}\n"
            f"✍️ Заполнено: {data['filled']}\n"
            f"📤 ДО: {data['do']}\n"
            f"📌 Не заполнено: {data['empty']}\n"
            f"📐 Просчеты: {data['calc']}",
            reply_markup=keyboard()
        )

        return ConversationHandler.END

    return REPORT



# ==========================
# КАЛЬКУЛЯТОР
# ==========================

CALC_AREA, CALC_PRICE = range(2,4)


async def calc_start(update,context):

    await update.message.reply_text(
        "Введите площадь стенда (м²):"
    )

    return CALC_AREA



async def calc_area(update,context):

    context.user_data["area"] = float(update.message.text)

    await update.message.reply_text(
        "Введите стоимость предложения:"
    )

    return CALC_PRICE



async def calc_price(update,context):

    price = float(update.message.text)
    area = context.user_data["area"]


    after_discount = price * 0.73
    sqm = after_discount / area


    if sqm < 35000:
        zone = "🔴 КРАСНАЯ ЗОНА"

    elif sqm < 45000:
        zone = "🟡 ЖЕЛТАЯ ЗОНА"

    else:
        zone = "🟢 ЗЕЛЕНАЯ ЗОНА"



    item = {
        "manager":
        update.effective_user.first_name,

        "date":
        str(datetime.now()),

        "area":
        area,

        "price":
        price,

        "after":
        after_discount,

        "sqm":
        sqm,

        "zone":
        zone
    }


    db["calculations"].append(item)
    save_db(db)


    await update.message.reply_text(

        f"{zone}\n\n"
        f"💰 После -27%:\n"
        f"{after_discount:,.0f} ₽\n\n"
        f"📐 Цена за м²:\n"
        f"{sqm:,.0f} ₽",

        reply_markup=keyboard()

    )


    return ConversationHandler.END



# ==========================
# СТАТИСТИКА
# ==========================

async def stats(update,context):

    reports = db["reports"]

    await update.message.reply_text(

        "📈 Статистика отдела\n\n"

        f"Отчетов: {len(reports)}\n"

        f"Всего ТЗ: "
        f"{sum(x['received'] for x in reports)}\n"

        f"Заполнено: "
        f"{sum(x['filled'] for x in reports)}\n"

        f"ДО: "
        f"{sum(x['do'] for x in reports)}\n"

        f"Просчетов: "
        f"{sum(x['calc'] for x in reports)}"

    )


# ==========================
# РЕЙТИНГ
# ==========================

async def rating(update,context):

    users={}

    for r in db["reports"]:

        name=r["manager"]

        users[name]=users.get(name,0)+r["calc"]


    text="🏆 Рейтинг\n\n"


    for i,(name,value) in enumerate(
        sorted(
            users.items(),
            key=lambda x:x[1],
            reverse=True
        ),
        start=1
    ):

        text+=f"{i}. {name} — {value} просчетов\n"



    await update.message.reply_text(text)



# ==========================
# ИСТОРИЯ
# ==========================

async def history(update,context):

    text="📂 Последние расчеты\n\n"

    for x in db["calculations"][-5:]:

        text+=(
            f"👤 {x['manager']}\n"
            f"📐 {x['area']} м²\n"
            f"💰 {x['sqm']:,.0f} ₽/м²\n"
            f"{x['zone']}\n\n"
        )


    await update.message.reply_text(text)



# ==========================
# ROUTER
# ==========================

async def router(update,context):

    t=update.message.text


    if t=="📈 Статистика":
        await stats(update,context)

    elif t=="🏆 Рейтинг":
        await rating(update,context)

    elif t=="📂 История расчетов":
        await history(update,context)



# ==========================
# ЗАПУСК
# ==========================


app=Application.builder().token(BOT_TOKEN).build()


app.add_handler(CommandHandler("start",start))


app.add_handler(
    ConversationHandler(
        entry_points=[
            MessageHandler(
                filters.Regex("📊 Отчет"),
                report_start
            )
        ],
        states={
            REPORT:[
                MessageHandler(
                    filters.TEXT,
                    report_step
                )
            ]
        },
        fallbacks=[]
    )
)


app.add_handler(
    ConversationHandler(
        entry_points=[
            MessageHandler(
                filters.Regex("🧮 Калькулятор"),
                calc_start
            )
        ],
        states={

            CALC_AREA:[
                MessageHandler(
                    filters.TEXT,
                    calc_area
                )
            ],

            CALC_PRICE:[
                MessageHandler(
                    filters.TEXT,
                    calc_price
                )
            ]
        },
        fallbacks=[]
    )
)


app.add_handler(
    MessageHandler(
        filters.TEXT,
        router
    )
)


print("BOT STARTED")

app.run_polling()
