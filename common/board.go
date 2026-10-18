package common

import "unicode"

func NormalizeBoard(value string) string {
	result := make([]rune, 0, 6)
	for _, char := range value {
		if unicode.IsLetter(char) || unicode.IsNumber(char) || char == '_' || char == '-' {
			result = append(result, char)
		}
		if len(result) == 6 {
			break
		}
	}
	return string(result)
}
