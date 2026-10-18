package server

import (
	"airclipboard/common"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/ua-parser/uap-go/uaparser"
	"hash/fnv"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var (
	// 等级列表
	levels = []string{"青铜Ⅰ", "青铜Ⅱ", "青铜Ⅲ", "白银Ⅰ", "白银Ⅱ", "白银Ⅲ", "黄金Ⅰ", "黄金Ⅱ", "黄金Ⅲ", "黄金Ⅳ",
		"铂金Ⅰ", "铂金Ⅱ", "铂金Ⅲ", "铂金Ⅳ", "钻石Ⅰ", "钻石Ⅱ", "钻石Ⅲ", "钻石Ⅳ", "钻石Ⅴ",
		"星耀Ⅰ", "星耀Ⅱ", "星耀Ⅲ", "星耀Ⅳ", "星耀Ⅴ", "最强王者", "无双王者", "荣耀王者", "传奇王者"}
	// 英雄列表
	heroes = []string{"廉颇", "小乔", "赵云", "墨子", "妲己", "嬴政", "孙尚香", "鲁班七号", "庄周", "刘禅", "高渐离",
		"阿轲", "钟无艳", "孙膑", "扁鹊", "白起", "芈月", "吕布", "周瑜", "夏侯惇", "甄姬", "曹操", "典韦", "宫本武藏",
		"李白", "马可波罗", "狄仁杰", "达摩", "项羽", "武则天", "老夫子", "关羽", "貂蝉", "安琪拉", "程咬金", "露娜", "姜子牙",
		"刘邦", "韩信", "王昭君", "兰陵王", "花木兰", "张良", "不知火舞", "娜可露露", "橘右京", "亚瑟", "孙悟空", "牛魔", "后羿",
		"刘备", "张飞", "李元芳", "虞姬", "钟馗", "成吉思汗", "杨戬", "雅典娜", "蔡文姬", "太乙真人", "哪吒", "诸葛亮", "黄忠",
		"大乔", "东皇太一", "干将莫邪", "鬼谷子", "铠", "百里守约", "百里玄策", "苏烈", "梦奇", "女娲", "明世隐", "公孙离",
		"杨玉环", "裴擒虎", "弈星", "狂铁", "米莱狄", "元歌", "孙策", "司马懿", "盾山", "伽罗", "沈梦溪", "李信", "上官婉儿",
		"嫦娥", "猪八戒", "盘古", "瑶", "云中君", "曜", "马超", "西施", "鲁班大师", "蒙犽", "镜", "蒙恬", "阿古朵", "夏洛特",
		"澜", "司空震", "艾琳", "云缨", "金蝉", "暃", "桑启", "戈娅", "海月", "赵怀真", "莱西奥", "姬小满", "亚连", "朵莉亚",
		"海诺", "敖隐", "大司命"}
)

type PeerName struct {
	model       string
	os          string
	browser     string
	deviceType  string
	deviceName  string
	displayName string
}

type Peer struct {
	socket       *websocket.Conn
	ip           string
	id           string
	rtcSupported bool
	name         *PeerName
	board        string
	lastBeat     atomic.Int64
	closeOnce    sync.Once

	cancelKeepAlive chan struct{}
	mu              sync.Mutex
}

type PeerServer struct {
	upgrader websocket.Upgrader
	rooms    map[string]map[string]*Peer
	mu       sync.Mutex
}

// NewPeer creates a new Peer
func NewPeer(socket *websocket.Conn, c *gin.Context) *Peer {
	newPeer := &Peer{
		socket:          socket,
		id:              c.GetString("peerID"),
		board:           common.NormalizeBoard(c.Query("board")),
		cancelKeepAlive: make(chan struct{}),
	}

	// set ip
	newPeer.ip = LogApiRequestIP(c, "NewPeer", -1)
	// if ip is localhost, set it to 127.0.0.1
	if newPeer.ip == "::1" || newPeer.ip == "::ffff:127.0.0.1" {
		newPeer.ip = "127.0.0.1"
	}
	// peerId由PeerServer生成，写入Cookie
	if newPeer.board == "" {
		newPeer.board = "public"
	}
	// set rtcSupported
	if strings.Contains(c.Request.URL.Path, "/webrtc") {
		newPeer.rtcSupported = true
	} else {
		newPeer.rtcSupported = false
	}
	// set name
	uaString := c.GetHeader("User-Agent")
	parser := uaparser.NewFromSaved()
	client := parser.Parse(uaString)

	deviceName := ""

	if client.Os.Family != "" {
		deviceName = client.Os.Family
		if client.Os.Family == "Mac OS X" {
			deviceName = "Mac"
		}
		deviceName += " "
	}

	if client.UserAgent.Family != "" {
		if strings.Contains(client.UserAgent.Family, "WKWebView") {
			deviceName += "WKWebView"
		} else if strings.HasPrefix(client.UserAgent.Family, "Chrome Mobile") {
			deviceName += "Mobile Chrome"
		} else {
			deviceName += client.UserAgent.Family
		}
	} else {
		deviceName += client.Device.Model
	}

	if deviceName == "" {
		deviceName = "Unknown Device"
	}

	displayName := getRandomHero(newPeer.id)

	newPeer.name = &PeerName{
		model:       client.Device.Model,     // 设备型号
		os:          client.Os.Family,        // 操作系统
		browser:     client.UserAgent.Family, // 浏览器
		deviceType:  client.Device.Family,    // 设备类型
		deviceName:  deviceName,              // 显示设备名称
		displayName: displayName,             // 显示名称
	}

	newPeer.lastBeat.Store(time.Now().UnixNano())

	return newPeer
}

func (p *Peer) getInfo() map[string]interface{} {
	return map[string]interface{}{
		"id":           p.id,
		"ip":           p.ip,
		"rtcSupported": p.rtcSupported,
		"name": map[string]interface{}{
			"model":       p.name.model,
			"os":          p.name.os,
			"browser":     p.name.browser,
			"deviceType":  p.name.deviceType,
			"deviceName":  p.name.deviceName,
			"displayName": p.name.displayName,
		},
	}
}

// NewPeerServer groups devices by their explicitly selected clipboard space.
// Reverse-proxied visitors must not all share an IP-based room.
func NewPeerServer() *PeerServer {
	return &PeerServer{
		upgrader: websocket.Upgrader{
			ReadBufferSize: 1024, WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				return origin == "" || IsAllowedOrigin(origin)
			},
		},
		rooms: make(map[string]map[string]*Peer),
	}
}

func (s *PeerServer) HandleConnection(c *gin.Context) {
	c.Set("peerID", uuid.NewString())
	socket, err := s.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade: %v", err)
		return
	}
	socket.SetReadLimit(256 << 10)
	peer := NewPeer(socket, c)
	s.joinRoom(peer)
	defer s.leaveRoom(peer)
	go s.keepAlive(peer)
	s.send(peer, map[string]interface{}{
		"type":    "display-name",
		"message": map[string]string{"displayName": peer.name.displayName, "deviceName": peer.name.deviceName},
	})
	for {
		_, message, err := socket.ReadMessage()
		if err != nil {
			return
		}
		s.handleMessage(peer, message)
	}
}

func (s *PeerServer) joinRoom(peer *Peer) {
	s.mu.Lock()
	if s.rooms[peer.board] == nil {
		s.rooms[peer.board] = make(map[string]*Peer)
	}
	others := make([]*Peer, 0, len(s.rooms[peer.board]))
	for _, other := range s.rooms[peer.board] {
		others = append(others, other)
	}
	s.rooms[peer.board][peer.id] = peer
	s.mu.Unlock()
	peers := make([]map[string]interface{}, 0, len(others))
	for _, other := range others {
		peers = append(peers, other.getInfo())
		s.send(other, map[string]interface{}{"type": "peer-joined", "peer": peer.getInfo()})
	}
	s.send(peer, map[string]interface{}{"type": "peers", "peers": peers})
}

func (s *PeerServer) leaveRoom(peer *Peer) {
	peer.closeOnce.Do(func() {
		close(peer.cancelKeepAlive)
		peer.socket.Close()
		s.mu.Lock()
		room := s.rooms[peer.board]
		delete(room, peer.id)
		others := make([]*Peer, 0, len(room))
		for _, other := range room {
			others = append(others, other)
		}
		if len(room) == 0 {
			delete(s.rooms, peer.board)
		}
		s.mu.Unlock()
		for _, other := range others {
			s.send(other, map[string]interface{}{"type": "peer-left", "peerId": peer.id})
		}
	})
}

func (s *PeerServer) NotifyBoard(board string) {
	s.mu.Lock()
	peers := make([]*Peer, 0, len(s.rooms[board]))
	for _, peer := range s.rooms[board] {
		peers = append(peers, peer)
	}
	s.mu.Unlock()
	for _, peer := range peers {
		s.send(peer, map[string]interface{}{"type": "board-update", "board": board})
	}
}

func (s *PeerServer) handleMessage(sender *Peer, message []byte) {
	var msg map[string]interface{}
	if json.Unmarshal(message, &msg) != nil {
		return
	}
	sender.lastBeat.Store(time.Now().UnixNano())
	switch msg["type"] {
	case "disconnect":
		s.leaveRoom(sender)
		return
	case "pong":
		return
	case "board-update":
		s.NotifyBoard(sender.board)
		return
	}
	recipientID, ok := msg["to"].(string)
	if !ok {
		return
	}
	s.mu.Lock()
	recipient := s.rooms[sender.board][recipientID]
	s.mu.Unlock()
	if recipient != nil {
		msg["sender"] = sender.id
		delete(msg, "to")
		s.send(recipient, msg)
	}
}

func (s *PeerServer) send(peer *Peer, message map[string]interface{}) {
	peer.mu.Lock()
	defer peer.mu.Unlock()
	peer.socket.SetWriteDeadline(time.Now().Add(5 * time.Second))
	if err := peer.socket.WriteJSON(message); err != nil {
		log.Printf("WebSocket write: %v", err)
	}
}

func (s *PeerServer) keepAlive(peer *Peer) {
	s.send(peer, map[string]interface{}{"type": "ping", "board": peer.board})
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if time.Since(time.Unix(0, peer.lastBeat.Load())) > 60*time.Second {
				s.leaveRoom(peer)
				return
			}
			s.send(peer, map[string]interface{}{"type": "ping", "board": peer.board})
		case <-peer.cancelKeepAlive:
			return
		}
	}
}

// seededRandom is a function that implements the Linear Congruential Generator (LCG) algorithm.
// It takes a seed value as input and returns a float64 pseudo-random number.
func seededRandom(seed uint32) float64 {
	const a = 1664525
	const c = 1013904223

	seed = a*seed + c
	return float64(seed) / float64(1<<32)
}

// hashStringToSeed hashes a string to a seed value.
func hashStringToSeed(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}

// getRandomHero generates a random hero and level.
// It takes a seed string as input and returns a string representing a hero and level.
func getRandomHero(seedStr string) string {
	heroSeed := hashStringToSeed(seedStr)
	levelSeed := heroSeed + 1 // 加1以确保种子不同
	heroIndex := int(math.Floor(seededRandom(heroSeed) * float64(len(heroes))))
	levelIndex := int(math.Floor(seededRandom(levelSeed) * float64(len(levels))))
	return fmt.Sprintf("%s %s", levels[levelIndex], heroes[heroIndex])
}

// isClosed checks if the given channel is closed.
// It returns true if the channel is closed, otherwise false.
func isClosed(ch <-chan struct{}) bool {
	select {
	case <-ch:
		return true
	default:
		return false
	}
}
