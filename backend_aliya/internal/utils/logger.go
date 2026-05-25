package utils

import (
	"io"
	"log"
	"os"
)

var (
	InfoLog   *log.Logger
	ErrorLog  *log.Logger
	AccessLog *log.Logger
)

func init() {
	// Создаем папку logs если её нет
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatal("Cannot create logs directory:", err)
	}

	// Файл для информационных логов
	infoFile, err := os.OpenFile("logs/info.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Cannot open info.log:", err)
	}

	// Файл для ошибок
	errorFile, err := os.OpenFile("logs/error.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Cannot open error.log:", err)
	}

	// Файл для доступа (все запросы)
	accessFile, err := os.OpenFile("logs/access.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Cannot open access.log:", err)
	}

	InfoLog = log.New(io.MultiWriter(os.Stdout, infoFile), "[INFO] ", log.Ldate|log.Ltime|log.Lshortfile)
	ErrorLog = log.New(io.MultiWriter(os.Stderr, errorFile), "[ERROR] ", log.Ldate|log.Ltime|log.Lshortfile)
	AccessLog = log.New(io.MultiWriter(os.Stdout, accessFile), "[ACCESS] ", log.Ldate|log.Ltime)
}

// LogError - запись ошибки
func LogError(err error, context string) {
	if err != nil {
		ErrorLog.Printf("%s: %v", context, err)
	}
}

// LogInfo - запись информационного сообщения
func LogInfo(message string) {
	InfoLog.Println(message)
}

// LogAccess - запись HTTP запроса
func LogAccess(method, path, status, duration string) {
	AccessLog.Printf("%s %s -> Status: %s Duration: %s", method, path, status, duration)
}
