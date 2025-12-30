/**
 * Created by wugy on 2016/12/19.
 */

var exportedResults = null; // 用于临时存储导出的数据

$(function () {
    console.log("页面开始初始化...");

    // 奖项配置顺序：特别奖30人 → 三等奖10人 → 二等奖5人 → 一等奖1人
    var awardSequence = [
        { id: 2005, name: "特别奖", count: 30 },
        { id: 2001, name: "三等奖", count: 10 },
        { id: 2002, name: "二等奖", count: 5 },
        { id: 2003, name: "一等奖", count: 1 }
    ];
    var currentAwardIndex = 0;
    var isAutoSequence = true;
    var autoSequenceCompleted = false;

    // 初始化变量
    var selfModuleName = 'slotmachine';
    var scrollTime = 800; // 将滚动速度统一设置为800ms（更快）
    var IntervalTimer = 50; // 间隔时间统一设置
    var scrollNumber = 5; // 滚动列数,默认有5个
    var prizeID = 0; // 奖品ID
    var prizeNumber = 10; // 抽奖人数
    var isLotteryArray = []; // 中奖用户
    var userArray = []; // 用户列表
    var prizeArray = []; // 奖项列表
    var isLotteryScrollID = 0; // 中奖名单滚动设置
    var prizeUserStr = '';
    var tigerUserLiWidth = 120;
    var tigerUserUlWidth = 513;
    var ulHeight = 250;
    var ulHeightHalf = 125;
    var totalWinnerCount = 0; // 已中奖总人数（全局统计）

    var isLotteryConfirmed = false; // 标记本轮抽奖是否已确认
    var pendingWinners = []; // 暂存待确认的中奖用户
    var pendingPrizeId = 0; // 暂存待确认的奖项ID
    var pendingWinnerCount = 0; // 暂存待确认的中奖人数

    // 音效变量
    var isSoundEnabled = true; // 是否启用音效
    var rollAudio = null;
    var winAudio = null;
    var bgmAudio = null;
    var bgmMuted = false; // 背景音乐是否静音

    // ========== 核心修复函数 ==========

    // ========== 修复的更新抽奖按钮状态函数 ==========
    var updateLotteryButton = function() {
        var $btn = $('.beginTiger');
        var currentAward = awardSequence[currentAwardIndex];

        if (autoSequenceCompleted) {
            $btn.text('抽奖完成').addClass('disabled').prop('disabled', true).removeClass('beginTiger_on');
            return;
        }

        if ($btn.hasClass('disabled')) {
            $btn.removeClass('disabled').prop('disabled', false);
        }

        // 根据按钮当前状态决定显示什么
        if ($btn.hasClass('beginTiger_on')) {
            $btn.text('停止抽奖');
        } else {
            var awardName = currentAward ? currentAward.name : '';
            $btn.text('开始抽奖：' + awardName);
        }
    };

    // ========== 更新抽奖信息显示函数 ==========
var updateLotteryInfo = function() {
    console.log("更新抽奖信息显示");

    // 获取当前奖项信息
    var currentAward = awardSequence[currentAwardIndex];
    if (!currentAward) return;

    var $prizeItem = $('#option_slotPrize a[data-prizeid=' + currentAward.id + '] label');
    var remainingCount = $prizeItem.length ? parseInt($prizeItem.html()) : currentAward.count;

    // 更新显示 - 只更新原有的三个信息项
    $('#current-prize').text(currentAward.name);
    $('#remain-count').text(remainingCount);
    $('#total-winners').text(totalWinnerCount);
    $('#remaining-users').text(userArray.length);

    // 移除奖项进度条相关代码，只保留原有的信息显示
    console.log("信息更新完成：当前奖项=" + currentAward.name +
                ", 剩余=" + remainingCount +
                ", 总中奖=" + totalWinnerCount +
                ", 剩余用户=" + userArray.length);
};

    // ========== 更新总中奖人数函数 ==========
    var updateTotalWinnerCount = function() {
        console.log("更新总中奖人数:", totalWinnerCount);
        $('#total-winners').text(totalWinnerCount);
    };

    // 初始化当前奖项
    var initCurrentAward = function() {
        if (!isAutoSequence || currentAwardIndex >= awardSequence.length) {
            autoSequenceCompleted = true;
            CommonShowInfo("所有奖项已抽完！", 1);
            updateLotteryButton();
            return false;
        }

        var currentAward = awardSequence[currentAwardIndex];
        prizeID = currentAward.id;
        prizeNumber = currentAward.count;

        // 确保按钮没有 beginTiger_on 类
        $('.beginTiger').removeClass('beginTiger_on');

        // 更新界面显示
        $('#current-prize').text(currentAward.name);
        $('#remain-count').text(currentAward.count);

        // 更新按钮显示
        updateLotteryButton();

        CommonShowInfo("当前奖项：" + currentAward.name + "，人数：" + currentAward.count, 1);
        return true;
    };

    // ========== 音频相关函数 ==========
    var initAudio = function() {
        try {
            rollAudio = document.getElementById('roll-sound');
            winAudio = document.getElementById('win-sound');
            bgmAudio = document.getElementById('bgm-sound');

            if (rollAudio) rollAudio.volume = 0.5;
            if (winAudio) winAudio.volume = 0.7;
            if (bgmAudio) bgmAudio.volume = 0.4;

            CommonShowInfo("音效已加载", 1);
        } catch (e) {
            console.log("音效初始化失败:", e);
        }
    };

    var playBGM = function() {
        if (!bgmAudio || bgmMuted) return;

        try {
            bgmAudio.currentTime = 0;
            bgmAudio.play().then(() => {
                console.log("背景音乐开始播放");
            }).catch(function(e) {
                console.log("背景音乐自动播放失败（需用户交互）:", e);
                document.addEventListener('click', function playOnFirstClick() {
                    if (!bgmMuted) {
                        bgmAudio.play().catch(err => console.log("用户交互后播放仍失败:", err));
                    }
                    document.removeEventListener('click', playOnFirstClick);
                }, { once: true });
            });
        } catch (e) {
            console.log("播放背景音乐异常:", e);
        }
    };

    var playRollSound = function() {
        if (!isSoundEnabled || !rollAudio) return;

        try {
            rollAudio.currentTime = 0;
            rollAudio.play().catch(function(e) {
                console.log("播放滚动音效失败:", e);
            });
        } catch (e) {
            console.log("播放滚动音效异常:", e);
        }
    };

    var stopRollSound = function() {
        if (!rollAudio) return;

        try {
            var fadeOut = function() {
                if (rollAudio.volume > 0.1) {
                    rollAudio.volume -= 0.1;
                    setTimeout(fadeOut, 50);
                } else {
                    rollAudio.pause();
                    rollAudio.volume = 0.5;
                }
            };
            fadeOut();
        } catch (e) {
            rollAudio.pause();
            console.log("停止滚动音效异常:", e);
        }
    };

    var playWinSound = function() {
        if (!isSoundEnabled || !winAudio) return;

        try {
            stopRollSound();
            setTimeout(function() {
                winAudio.currentTime = 0;
                winAudio.play().catch(function(e) {
                    console.log("播放中奖音效失败:", e);
                });
            }, 500);
        } catch (e) {
            console.log("播放中奖音效异常:", e);
        }
    };

    // ========== 修复的开始抽奖函数 ==========

    // ========== 修复的开始抽奖函数 ==========
var beginTiger = function () {
    console.log("开始摇奖，当前奖项:", currentAwardIndex, "奖项ID:", prizeID, "抽奖人数:", prizeNumber);

    if (autoSequenceCompleted) {
        CommonShowInfo("所有奖项已抽完！", 0);
        return false;
    }

    if (prizeID == 0) {
        initCurrentAward();
        if (prizeID == 0) {
            CommonShowInfo("抽奖初始化失败！", 0);
            return false;
        }
    }

    prizeUserStr = '';

    if (prizeNumber > userArray.length) {
        CommonShowInfo("抽奖人数不够!");
        return false;
    }

    // 获取当前奖项剩余数量
    var $prizeItem = $('#option_slotPrize a[data-prizeid=' + prizeID + '] label');
    var currentCount = parseInt($prizeItem.html());

    if (prizeNumber > currentCount) {
        CommonShowInfo("奖品数量不够哒!");
        return false;
    }

    // 关键修复：添加 beginTiger_on 类
    $('.beginTiger').addClass('beginTiger_on');

    // 更新按钮状态
    updateLotteryButton();

    // 播放滚动音效
    playRollSound();

    // 添加遮罩
    $("#tigerSelect").append('<div class="shade1"></div><div class="shade2"></div>');

    // 开始滚动 - 统一滚动时间，不再乘以 scrollNumber/4
    $('.tigerList').each(function (i) {
        var ulBox = $(this).find('ul');
        var _height = ulBox.children().size() * ulHeightHalf;
        ulBox.height(_height);
        if (ulBox.children().size() > 2) {
            setTimeout(function () {
                $(".tigerList").removeClass("wait");
                // 统一使用固定的 scrollTime，不再乘以 (scrollNumber / 4)
                beginScroll(ulBox, _height, scrollTime);
            }, IntervalTimer * i);
        } else if (ulBox.children().size() == 0) {
            ulBox.parent().remove();
        }
    });

    console.log("抽奖已开始");
    return true;
};

// 滚动函数
var beginScroll = function (obj, height, timer) {
    obj.animate({'top': -height / 2 + ulHeightHalf + 'px'}, timer, 'linear', function () {
        obj.css('top', -(height - ulHeight) + 'px');
        beginScroll(obj, height, timer); // 使用相同的timer参数
    });
};
    // ========== 修复的停止抽奖函数 ==========
    var stopTiger = function () {
        console.log("停止抽奖");

        // 关键修复：移除 beginTiger_on 类
        $('.beginTiger').removeClass('beginTiger_on');

        // 更新按钮状态
        updateLotteryButton();

        $(".shade1").width("100%");

        isLotteryArray = [];
        var allNumber = 0;
        var userHead;

        isLotteryConfirmed = false;
        pendingWinnerCount = 0;
        pendingPrizeId = prizeID;

        var tempWinners = [];

        $('.tigerList').each(function (i) {
            var ulBox = $(this).find('ul');
            var _height = ulBox.height();
            setTimeout(function () {
                ulBox.stop();
                var _top = Math.ceil(parseInt(ulBox.css('top')) / ulHeightHalf) * ulHeightHalf;
                ulBox.animate({'top': _top}, 200, 'swing', function () {
                    var userID;
                    var userNickName;

                    // 获取中奖用户
                    if ($('.oneTiger').size() > 0) {
                        ulBox.children('li').each(function () {
                            if ($(this).position().top == -_top) {
                                userID = $(this).data('userid');
                                userHead = $(this).html();
                                userNickName = $(this).data('nickname');
                                isLotteryArray.push(userID);
                                prizeUserStr += '<li data-level="' + prizeID + '" data-nickname="' + userNickName + '" data-isluck="' + userID + '">' + userHead + '</li>';
                                tempWinners.push({
                                    id: userID,
                                    name: userNickName,
                                    html: userHead
                                });
                            }
                        });
                    } else {
                        ulBox.children('li').each(function () {
                            if (ulBox.parent().parent().hasClass('oneUser')) {
                                if ($(this).position().top == -_top) {
                                    userID = $(this).data('userid');
                                    userHead = $(this).html();
                                    userNickName = $(this).data('nickname');
                                    isLotteryArray.push(userID);
                                    prizeUserStr += '<li data-level="' + prizeID + '" data-nickname="' + userNickName + '" data-isluck="' + userID + '">' + userHead + '</li>';
                                    tempWinners.push({
                                        id: userID,
                                        name: userNickName,
                                        html: userHead
                                    });
                                }
                            } else {
                                if ($(this).position().top == -_top || $(this).position().top == -_top + ulHeightHalf) {
                                    userID = $(this).data('userid')
                                    userHead = $(this).html();
                                    userNickName = $(this).data('nickname');
                                    isLotteryArray.push(userID);
                                    prizeUserStr += '<li data-level="' + prizeID + '" data-nickname="' + userNickName + '" data-isluck="' + userID + '">' + userHead + '</li>';
                                    tempWinners.push({
                                        id: userID,
                                        name: userNickName,
                                        html: userHead
                                    });
                                }
                            }
                        });
                    }

                    pendingWinnerCount = tempWinners.length;
                    isLotteryScrollID = 0;
                    allNumber++;

                    if (allNumber == $('.tigerList').size()) {
                        $('.beginTiger').removeClass('beginTiger_on');
                        $(".shade1").width("0");
                        $(".shade2").width("0");

                        stopRollSound();
                        pendingWinners = tempWinners;

                        // 直接显示中奖特效
                        if (pendingWinnerCount > 0) {
                            console.log("停止抽奖，显示中奖特效，人数:", pendingWinnerCount);
                            setTimeout(function() {
                                showLuckAnimate();
                            }, 100);
                        } else {
                            setTimeout(function() {
                                CommonShowInfo('抽奖失败，未抽中任何人员', 0);
                                $(".shade1").remove();
                                $(".shade2").remove();
                            }, 100);
                        }
                    }
                });
            }, 50 * (i + 1));
        });
    };

    var saveLotteryResult = function(prizeId, prizeName, winners) {
        // 保存抽奖结果到本地存储的逻辑
        var results = localStorage.getItem("LotteryResults");
        var resultsArray = results ? JSON.parse(results) : [];

        var result = {
            prizeId: prizeId,
            prizeName: prizeName,
            timestamp: new Date().toISOString(),
            winners: winners
        };

        resultsArray.push(result);
        localStorage.setItem("LotteryResults", JSON.stringify(resultsArray));
    };

    // ========== 更新奖项数量显示函数 ==========
    var updatePrizeCountDisplay = function(prizeId, newCount) {
        var $prizeItem = $('#option_slotPrize a[data-prizeid=' + prizeId + '] label');
        if ($prizeItem.length) {
            $prizeItem.text(newCount);
        }
    };

    // ========== 新增：自动确认中奖人员函数 ==========
    // ========== 新增：自动确认中奖人员函数 ==========
var autoConfirmWinners = function() {
    console.log("自动确认中奖人员，人数:", pendingWinnerCount);

    var $prizeItem = $('#option_slotPrize a[data-prizeid=' + pendingPrizeId + '] label');
    var currentCount = parseInt($prizeItem.html());

    if (currentCount < pendingWinnerCount) {
        CommonShowInfo("奖项剩余名额不足！", 0);
        return false;
    }

    var newCount = currentCount - pendingWinnerCount;

    // 保存抽奖结果
    var prizeName = $('#option_slotPrize a[data-prizeid=' + pendingPrizeId + '] div').text();
    var winnersWithPhone = pendingWinners.map(function (winner) {
        var originalUser = userArray.find(function (u) {
            return u.Id == winner.id;
        });
        return {
            id: winner.id,
            name: winner.name,
            phone: originalUser ? originalUser.Phone : ''
        };
    });

    saveLotteryResult(pendingPrizeId, prizeName, winnersWithPhone);

    // 从用户数组中永久移除中奖人员
    var removedCount = 0;
    var newUserArray = [];

    for (var i = 0; i < userArray.length; i++) {
        var isWinner = false;

        for (var j = 0; j < pendingWinners.length; j++) {
            if (userArray[i].Id == pendingWinners[j].id) {
                isWinner = true;
                removedCount++;
                break;
            }
        }

        if (!isWinner) {
            newUserArray.push(userArray[i]);
        }
    }

    userArray = newUserArray;

    // 更新奖项显示
    updatePrizeCountDisplay(pendingPrizeId, newCount);

    // 更新数组数据
    for (var i = 0; i < prizeArray.length; i++) {
        if (prizeArray[i].Id == pendingPrizeId) {
            prizeArray[i].Count = newCount;
            break;
        }
    }

    localStorage.DaxPrize = JSON.stringify(prizeArray);

    totalWinnerCount += pendingWinnerCount;

    localStorage.setItem("DaxFans", JSON.stringify(userArray));

    isLotteryConfirmed = true;

    updateLotteryInfo();

    CommonShowInfo("已确认" + pendingWinnerCount + "名中奖者，并已从抽奖池中移除", 1);

    pendingWinners = [];
    pendingWinnerCount = 0;
    pendingPrizeId = 0;

    checkAndShowExportButton();

    if (newCount <= 0 && isAutoSequence) {
        setTimeout(function () {
            currentAwardIndex++;
            if (currentAwardIndex < awardSequence.length) {
                initCurrentAward();
                CommonShowInfo("当前奖项已抽完，已切换到：" + awardSequence[currentAwardIndex].name + "，请点击'开始抽奖'按钮继续", 1);
            } else {
                autoSequenceCompleted = true;
                CommonShowInfo("🎉 所有奖项已全部抽完！", 1);
                updateLotteryButton();
            }
        }, 1500);
    }

    return true;
};

    // ========== 其他重要函数 ==========
    var SubmitSlotMachineFans = function () {
        console.log("提交中奖名单（手动），待确认人数:", pendingWinnerCount);
        if (pendingWinnerCount == 0) {
            CommonShowInfo('请先进行抽奖操作');
            return false;
        }

        // 调用自动提交函数
        return autoConfirmWinners();
    };

    // ========== 修复的显示中奖特效函数 ==========
    var showLuckAnimate = function () {
        console.log("显示中奖特效，中奖人数:", isLotteryArray.length);

        // 如果没有人中奖，直接返回
        if (isLotteryArray.length === 0) {
            CommonShowInfo('抽奖失败，未抽中任何人员', 0);
            $(".shade1").remove();
            $(".shade2").remove();
            return;
        }

        // 播放中奖音效
        playWinSound();

        // 显示烟花效果
        FireworkShow();

        // 添加旋转光效
        $('body').append('<div class="light">');

        // 根据中奖人数确定显示样式
        var className = '';
        if (prizeNumber <= 2) {
            className = 'bigImg';
        } else if (prizeNumber <= 4) {
            className = 'normalImg';
        } else {
            className = 'manyImg';
        }

        // 根据中奖人数确定字体大小
        var fontSizeClass = '';
        if (prizeNumber <= 2) {
            fontSizeClass = 'font-xxlarge';
        } else if (prizeNumber <= 5) {
            fontSizeClass = 'font-xlarge';
        } else {
            fontSizeClass = 'font-large';
        }

        // 创建中奖展示区域 - 修复：添加点击关闭的事件监听
        var $showPrizeUser = $('<div id="showPrizeUser" style="cursor:pointer;"><div class="center-container"><ul class="' + className + ' ' + fontSizeClass + '">' + prizeUserStr + '</ul></div></div>');

        // 添加点击关闭提示
        $showPrizeUser.append('<div id="clickToClose">点击任意位置继续（将自动确认中奖名单）</div>');

        $('body').append($showPrizeUser);

        // 创建动画卡片
        $('#showPrizeUser li').each(function (index) {
            var $card = $('<div data-level="' + $(this).data('level') + '" data-nickname="' + $(this).data('nickname') + '" data-isluck="' + $(this).data('isluck') + '" style="left:' + $(this).offset().left + 'px;top:' + $(this).offset().top + 'px" class="tigerUser ' + className + ' ' + fontSizeClass + '">' + $(this).html() + '</div>');

            $card.css({
                'opacity': 0,
                'transform': 'scale(0.5)',
                'transition': 'all 0.5s ease ' + (index * 0.1) + 's'
            });

            $('body').append($card);

            setTimeout(function() {
                $card.css({
                    'opacity': 1,
                    'transform': 'scale(1)'
                });
            }, 100);

            $(this).css('opacity', 0);
        });

        // 显示闪光效果
        $("#slotmachineFlash").css('opacity', 1).show();

        // 居中显示中奖卡片
        setTimeout(function() {
            centerPrizeCards();
        }, 50);

        // ========== 修复点击事件绑定 ==========
// 先移除可能存在的旧事件监听器
$(document).off('click.closePrizeScreen');
$(document).off('keydown.closePrizeScreen');

        // 定义关闭处理函数
var closePrizeScreen = function(e) {
    console.log("接收到关闭事件，事件类型:", e.type, "目标:", e.target);

    // 如果是键盘事件，只响应ESC键
    if (e.type === 'keydown' && e.keyCode !== 27) {
        return;
    }

    console.log("关闭中奖特效，开始自动处理...");

    // 1. 从抽奖池移除中奖用户
    for (var i = 0; i < isLotteryArray.length; i++) {
        $('.tigerMain li[data-userid=' + isLotteryArray[i] + ']').remove();
    }

    // 2. 自动确认中奖名单
    if (!isLotteryConfirmed && pendingWinnerCount > 0 && pendingPrizeId > 0) {
        console.log("自动确认中奖名单，人数:", pendingWinnerCount);
        autoConfirmWinners(); // 调用自动确认函数
    }

    // 3. 隐藏特效
    FireworkHide();
    $(".light").animate({"opacity": "0"}, 300, function () {
        $(".light").remove();
    });

    // 隐藏中奖展示区域
    $('#showPrizeUser').animate({'opacity': '0'}, 300, function () {
        $(this).remove();
    });

    // 隐藏动画卡片
    $('.tigerUser').animate({'opacity': '0'}, 200, function() {
        $(this).remove();
    });

    // 移除遮罩
    $(".shade1").remove();
    $(".shade2").remove();

    // 4. 重新设置滚动界面
    setTimeout(function() {
        setScrollDiv();
    }, 100);

    // 5. 更新lottery-info信息
    setTimeout(function() {
        updateLotteryInfoDisplay();
        checkAndSwitchToNextAward();
    }, 300);

    // 6. 移除事件监听
    $(document).off('click.closePrizeScreen');
    $(document).off('keydown.closePrizeScreen');
};

// *** 关键修复：简化事件绑定逻辑 ***
// 直接为document绑定点击事件，点击任意位置都关闭
$(document).on('click.closePrizeScreen', function(e) {
    // 确保点击时中奖展示区域存在
    if ($('#showPrizeUser').length > 0) {
        console.log("点击任意位置关闭中奖展示");
        closePrizeScreen(e);
    }
});

// 绑定ESC键关闭
$(document).on('keydown.closePrizeScreen', function(e) {
    if (e.keyCode === 27 && $('#showPrizeUser').length > 0) {
        closePrizeScreen(e);
    }
});

// 同时为展示区域本身也绑定点击事件（防止事件冒泡问题）
$('#showPrizeUser').on('click', function(e) {
    e.stopPropagation();
    closePrizeScreen(e);
});

        console.log("中奖特效已显示，可点击任意位置关闭");
    };

    // ========== 新增：更新lottery-info显示函数 ==========
    var updateLotteryInfoDisplay = function() {
        console.log("更新lottery-info显示");

        // 获取当前奖项
        var currentAward = awardSequence[currentAwardIndex];
        if (!currentAward) return;

        // 获取当前奖项剩余人数
        var $prizeItem = $('#option_slotPrize a[data-prizeid=' + currentAward.id + '] label');
        var remainingCount = $prizeItem.length ? parseInt($prizeItem.html()) : currentAward.count;

        // 更新显示
        $('#current-prize').text(currentAward.name);
        $('#remain-count').text(remainingCount);
        $('#total-winners').text(totalWinnerCount);
        $('#remaining-users').text(userArray.length);

        console.log("更新完成：奖项=" + currentAward.name +
                    ", 剩余=" + remainingCount +
                    ", 总中奖=" + totalWinnerCount +
                    ", 剩余用户=" + userArray.length);
    };

    // ========== 新增：检查并切换到下一奖项函数 ==========
// ========== 修改后的：检查并切换到下一奖项函数（不自动开始） ==========
var checkAndSwitchToNextAward = function() {
    console.log("=== 检查并切换到下一奖项 ===");
    console.log("当前奖项索引:", currentAwardIndex);
    console.log("奖项序列:", awardSequence);
    console.log("当前奖项:", awardSequence[currentAwardIndex]);

    if (autoSequenceCompleted) {
        console.log("所有奖项已抽完");
        return;
    }

    var currentAward = awardSequence[currentAwardIndex];
    if (!currentAward) {
        console.error("当前奖项不存在!");
        return;
    }

    // 获取当前奖项剩余名额
    var $prizeItem = $('#option_slotPrize a[data-prizeid=' + currentAward.id + '] label');
    var remainingCount = $prizeItem.length ? parseInt($prizeItem.html()) : currentAward.count;

    console.log("当前奖项:", currentAward.name, "(ID:" + currentAward.id + ")", "剩余名额:", remainingCount);

    if (remainingCount <= 0) {
        console.log(currentAward.name + "已抽完，准备切换到下一奖项");

        // 保存当前奖项名称用于提示
        var completedAwardName = currentAward.name;

        // 当前奖项已抽完，切换到下一奖项
        currentAwardIndex++;

        if (currentAwardIndex < awardSequence.length) {
            // 切换到下一奖项
            var nextAward = awardSequence[currentAwardIndex];
            prizeID = nextAward.id;
            prizeNumber = nextAward.count;

            console.log("切换到下一奖项:", nextAward.name, "(ID:" + nextAward.id + ")");

            // 验证顺序是否正确
            console.log("顺序验证:");
            for (var i = 0; i < awardSequence.length; i++) {
                var award = awardSequence[i];
                var marker = (i === currentAwardIndex) ? "← 当前" : "";
                console.log((i + 1) + ". " + award.name + " (ID:" + award.id + ")" + marker);
            }

            // 更新界面显示
            updateLotteryInfoDisplay();

            // 更新按钮显示
            updateLotteryButton();

            // 提示用户需要手动点击开始
            CommonShowInfo(completedAwardName + "已抽完，已切换到：" + nextAward.name + "，点击'开始抽取" + nextAward.name + "'按钮开始抽取" + nextAward.count + "人", 1);

            console.log("切换完成，按钮应显示: 开始抽取" + nextAward.name);

        } else {
            // 所有奖项已抽完
            console.log("所有奖项已抽完");
            autoSequenceCompleted = true;
            updateLotteryButton();
            CommonShowInfo("🎉 所有奖项已全部抽完！", 1);

            // 更新完成状态
            if ($('#completedText').length === 0) {
                $('.lottery-info').prepend('<div id="completedText" style="color:#ffd700;font-size:18px;font-weight:bold;margin-bottom:10px;width:100%;text-align:center;">🎉 所有奖项已抽完！</div>');
            }
        }
    } else {
        // 当前奖项还有剩余名额
        console.log("当前奖项还有剩余名额，等待用户点击开始");
        CommonShowInfo(currentAward.name + "还有" + remainingCount + "个名额，请点击'开始抽取" + currentAward.name + "'继续", 1);
    }
};

    // 烟花效果函数（如果不存在）
    var FireworkShow = function() {
        $('.fire').animate({top: '0'}, 500);
    };

    var FireworkHide = function() {
        $('.fire').animate({top: '-5000px'}, 500);
    };

   // 清空历史记录函数
var clearLotteryHistory = function() {
    console.log("开始清空历史记录...");

    // 1. 清除本地存储中的抽奖结果
    localStorage.removeItem("LotteryResults");
    //不删除！！！
    localStorage.removeItem("DaxFans"); // 清除用户数据
    localStorage.removeItem("DaxPrize"); // 清除奖项数据

    // 2. 重置所有奖项数量到初始值
    awardSequence.forEach(function(award) {
        // 更新奖项显示
        var $prizeItem = $('#option_slotPrize a[data-prizeid=' + award.id + '] label');
        if ($prizeItem.length) {
            $prizeItem.text(award.count);
        }

        // 更新prizeArray数据
        for (var i = 0; i < prizeArray.length; i++) {
            if (prizeArray[i].Id == award.id) {
                prizeArray[i].Count = award.count;
                break;
            }
        }
    });

    // 3. 保存重置后的奖项数据到本地存储
    localStorage.DaxPrize = JSON.stringify(prizeArray);

    // 4. 重置所有状态变量
    currentAwardIndex = 0;
    autoSequenceCompleted = false;
    totalWinnerCount = 0;
    isLotteryConfirmed = false;
    pendingWinners = [];
    pendingWinnerCount = 0;
    pendingPrizeId = 0;
    isLotteryArray = [];

    // 5. 重新初始化当前奖项
    if (prizeArray.length > 0) {
        prizeID = awardSequence[currentAwardIndex].id;
        prizeNumber = awardSequence[currentAwardIndex].count;
    }

    // 6. 更新抽奖按钮状态
    updateLotteryButton();

    // 7. 更新信息显示
    updateLotteryInfo();

    // 8. 更新已中奖总人数显示
    $('#total-winners').text('0');

    // 9. 更新剩余用户数显示
    $('#remaining-users').text(userArray.length);

    // 10. 隐藏按钮和状态
    $('#exportBtn').hide();

    $('.lottery-info').removeClass('has-winners').removeClass('all-completed');
    $('#completedText').remove();

    console.log("历史记录已清空，奖项已重置");
    CommonShowInfo("抽奖历史已清空，所有奖项数量已重置！", 1);
};




    // ========== 初始化函数 ==========

    // 模拟select效果
    $(".select").click(function (event) {
        event.stopPropagation();
        if (!$(this).parent().hasClass('disabled')) {
            $(".select_option").slideUp();
            if ($(this).next(".select_option").css("display") == "none") {
                $(this).next(".select_option").css({
                    left: $(this).position().left,
                    top: $(this).position().top + 35
                });
                $(this).next(".select_option").slideDown("fast");
            }
            else {
                $(this).next(".select_option").slideUp();
            }
        }
        $(document).bind("click", function () {
            $(".select_option").slideUp();
        });
    });

    // 绑定开启活动按钮的点击事件
    $('#index>.clickBtn').on('click', function () {
        $("#index").remove();
        $('body').triggerHandler('active');
        $('body').triggerHandler('modulechange', ["slotmachine"]);
    });

    // 核心按钮点击事件绑定（修复关键）
    $(document).on('click', '.beginTiger', function(e) {
        e.preventDefault();
        e.stopPropagation();

        console.log("抽奖按钮点击，当前状态:", $(this).hasClass('beginTiger_on') ? "开始中" : "停止中");

        if ($(this).hasClass('disabled')) {
            console.log("按钮已禁用");
            return false;
        }

        if ($(this).hasClass('beginTiger_on')) {
            console.log("执行停止抽奖");
            stopTiger();
        } else {
            console.log("执行开始抽奖");
            beginTiger();
        }

        return false;
    });

    // 确认名单按钮
    $('.tiger_submit').click(function () {
        SubmitSlotMachineFans();
    });

    // 导出按钮
    $('#exportBtn').off('click').click(function () {
        exportConfirmedWinners();
    });

    // 清空历史按钮
    $('#clearHistoryBtn').click(function() {
        if (confirm("确定要清空所有抽奖历史吗？这将重置所有奖项数量，但不会删除用户数据。")) {
            clearLotteryHistory();
        }
    });



    // 模块切换
    $('body').on('modulechange', function (e, moduleName) {
        if (moduleName == selfModuleName) {
            $('#slotmachine').show();
            checkAndShowExportButton();
        } else {
            $('#slotmachine').hide();
            if (rollAudio) {
                rollAudio.pause();
                rollAudio.currentTime = 0;
            }
            if (winAudio) {
                winAudio.pause();
                winAudio.currentTime = 0;
            }
        }
    });

    // ========== 数据加载函数 ==========
var GetPrize = function () {
    console.log("开始加载奖项数据...");
    StorageForGetReful("DaxPrize","data/GetPrize.json",GetDaxPrize);

    function GetDaxPrize(data) {
        console.log("奖项数据加载完成:", data);

        // 定义正确的奖项顺序
        var correctAwardOrder = [
            { id: 2005, name: "特别奖", count: 30 },
            { id: 2001, name: "三等奖", count: 10 },
            { id: 2002, name: "二等奖", count: 5 },
            { id: 2003, name: "一等奖", count: 1 }
        ];

        if (data && data.length > 0) {
            prizeArray = data;
            $('#option_slotPrize').empty();

            // 调试：打印所有奖项
            console.log("所有奖项数据:");
            $(data).each(function (index, element) {
                console.log("奖项", index, ":", element.Id, element.Name, element.Count);
            });

            // 1. 先按正确顺序创建界面元素
            correctAwardOrder.forEach(function(correctAward) {
                // 在数据中查找对应的奖项
                var awardData = data.find(function(item) {
                    return item.Id == correctAward.id;
                });

                // 如果数据中存在该奖项，使用数据中的数量，否则使用默认数量
                var count = awardData ? awardData.Count : correctAward.count;
                var name = awardData ? awardData.Name : correctAward.name;

                if(correctAward.id == 2005){
                    $('#option_slotPrize').append('<a data-prizeid="' + correctAward.id + '" data-prizename="' + name + '" data-amount="' + count + '"><div>' + name + '</div> <span style="visibility: hidden;">剩<label>' + count + '</label>名</span></a>');
                } else {
                    $('#option_slotPrize').append('<a data-prizeid="' + correctAward.id + '" data-prizename="' + name + '" data-amount="' + count + '"><div>' + name + '</div> <span>剩<label>' + count + '</label>名</span></a>');
                }
            });

            // 2. 创建过滤并排序后的prizeArray（去掉特等奖2004）
            var filteredPrizeArray = data.filter(function(prize) {
                return prize.Id !== 2004; // 过滤掉特等奖
            });

            // 按正确顺序排序
            var prizeOrderMap = {
                2005: 1, // 特别奖 - 第1位
                2001: 2, // 三等奖 - 第2位
                2002: 3, // 二等奖 - 第3位
                2003: 4  // 一等奖 - 第4位
            };

            filteredPrizeArray.sort(function(a, b) {
                var orderA = prizeOrderMap[a.Id] || 999;
                var orderB = prizeOrderMap[b.Id] || 999;
                return orderA - orderB;
            });

            // 3. 更新全局的prizeArray，确保顺序正确
            prizeArray = filteredPrizeArray;

            // 4. 更新 awardSequence，确保顺序和数量正确
            awardSequence = correctAwardOrder.map(function(correctAward) {
                // 在过滤后的数据中查找对应奖项
                var awardData = filteredPrizeArray.find(function(item) {
                    return item.Id == correctAward.id;
                });

                return {
                    id: correctAward.id,
                    name: correctAward.name,
                    count: awardData ? awardData.Count : correctAward.count
                };
            });

            console.log("强制排序后的 awardSequence:");
            awardSequence.forEach(function(award, index) {
                console.log("第" + (index + 1) + "位: " + award.name +
                           " (ID:" + award.id + ")" +
                           " 数量:" + award.count);
            });

            // 5. 确保奖项数量不为0（如果数据中为0，使用默认值）
            var hasZeroCount = false;
            awardSequence.forEach(function(award) {
                if (award.count <= 0) {
                    hasZeroCount = true;
                    console.warn("奖项" + award.name + "数量为0，将使用默认值");

                    // 设置默认值
                    switch(award.id) {
                        case 2005: award.count = 30; break;
                        case 2001: award.count = 10; break;
                        case 2002: award.count = 5; break;
                        case 2003: award.count = 1; break;
                    }

                    // 更新界面显示
                    var $prizeItem = $('#option_slotPrize a[data-prizeid=' + award.id + '] label');
                    if ($prizeItem.length) {
                        $prizeItem.text(award.count);
                    }
                }
            });

            if (hasZeroCount) {
                console.log("有奖项数量为0，已重置为默认值");
            }

            // 6. 重新初始化当前奖项索引
            currentAwardIndex = 0;
            autoSequenceCompleted = false;

            // 7. 设置当前奖项ID和人数
            if (awardSequence.length > 0) {
                prizeID = awardSequence[0].id;
                prizeNumber = awardSequence[0].count;
            }

            // 8. 初始化第一个奖项
            setTimeout(function() {
                console.log("初始化第一个奖项:", awardSequence[0].name, "数量:", awardSequence[0].count);
                initCurrentAward();
            }, 500);

            // 9. 绑定奖项选择事件
            $('#option_slotPrize a').click(function () {
                var $this = $(this);
                var prizeId = $this.data('prizeid');
                var prizeName = $this.find('div').text();

                $('#select_slotmachine a')
                    .text(prizeName)
                    .data('prizeid', prizeId);

                prizeID = prizeId;
                $('.select_option').slideUp();
                updateLotteryInfo();
            });

            // 10. 保存排序后的数据到本地存储
            var sortedPrizeArray = awardSequence.map(function(item) {
                return {
                    Id: item.id,
                    Name: item.name,
                    Count: item.count
                };
            });
            localStorage.setItem("DaxPrize", JSON.stringify(sortedPrizeArray));

        } else {
            console.error("奖项数据为空或格式错误");
            // 使用 awardSequence 创建默认数据（已过滤特等奖）
            prizeArray = awardSequence.map(function(item) {
                return {
                    Id: item.id,
                    Name: item.name,
                    Count: item.count
                };
            });
            localStorage.setItem("DaxPrize", JSON.stringify(prizeArray));
            GetPrize();
        }
    }
};

    var GetFans = function () {
        console.log("开始加载用户数据...");
        CommonLoading('数据加载中,请稍后');
        userArray = [];
        $('#tigerUserBox ul').html('');

        if (localStorage["DaxFans"]) {
            try {
                var data = JSON.parse(localStorage["DaxFans"]);
                if (data && Array.isArray(data)) {
                    userArray = data;
                    console.log("从本地存储加载用户数据成功:", userArray.length + "条");
                    setScrollDiv();
                    CommonLoaded();
                    return;
                }
            } catch (e) {
                console.log("解析本地用户数据失败:", e);
            }
        }

        StorageForGetReful("DaxFans", "data/GetFans.csv", GetDaxFans);

        setTimeout(function() {
            if ($('#loading').length > 0) {
                console.log("数据加载超时，强制完成");
                if (userArray.length === 0) {
                    console.log("创建测试用户数据");
                    var testUsers = [];
                    for (var i = 1; i <= 20; i++) {
                        testUsers.push({
                            Id: 'test_' + i,
                            NickName: '测试用户' + i,
                            Phone: '13800138' + (i < 10 ? '0' + i : i),
                            CatNumber: '',
                            IsPrivateteach: false
                        });
                    }
                    userArray = testUsers.sort(randomsort);
                    localStorage.setItem("DaxFans", JSON.stringify(userArray));
                    setScrollDiv();
                }
                CommonLoaded();
            }
        }, 3000);
    };

    function GetDaxFans(data) {
        console.log("GetDaxFans被调用，数据类型:", typeof data);
        try {
            var result = [];

            if (typeof data === 'string') {
                var lines = data.trim().split('\n');
                console.log("CSV行数:", lines.length);

                if (lines.length > 0) {
                    var headers = lines[0].split(',').map(function (h) {
                        return h.trim().replace(/"/g, '');
                    });

                    for (var i = 1; i < lines.length; i++) {
                        var line = lines[i].trim();
                        if (!line) continue;

                        var values = line.split(',');
                        var obj = {};

                        for (var j = 0; j < headers.length && j < values.length; j++) {
                            var key = headers[j];
                            var value = values[j] ? values[j].trim().replace(/"/g, '') : '';

                            if (key === 'Id' || key === 'id') obj.Id = value;
                            if (key === 'NickName' || key === '昵称' || key === 'name') obj.NickName = value;
                            if (key === 'Phone' || key === '手机' || key === 'phone') obj.Phone = value;
                            if (key === 'CatNumber') obj.CatNumber = value;
                        }

                        if (obj.NickName) {
                            if (!obj.Id) obj.Id = 'user_' + i;
                            result.push(obj);
                        }
                    }
                }
            } else if (Array.isArray(data)) {
                result = data;
            }

            if (result.length > 0) {
                userArray = result.sort(randomsort);
                localStorage.setItem("DaxFans", JSON.stringify(userArray));
                setScrollDiv();
                CommonLoaded();
                console.log("用户数据加载成功:", userArray.length + "条");
            } else {
                console.log("用户数据为空，创建测试数据");
                var testUsers = [];
                for (var i = 1; i <= 20; i++) {
                    testUsers.push({
                        Id: 'test_' + i,
                        NickName: '测试用户' + i,
                        Phone: '13800138' + (i < 10 ? '0' + i : i),
                        CatNumber: '',
                        IsPrivateteach: false
                    });
                }
                userArray = testUsers.sort(randomsort);
                localStorage.setItem("DaxFans", JSON.stringify(userArray));
                setScrollDiv();
                CommonLoaded();
            }
        } catch (e) {
            console.error("解析用户数据异常:", e);
            CommonLoaded();
        }
    }

    // ========== 辅助函数 ==========
    function randomsort(a, b) {
        return Math.random()>.5 ? -1 : 1;
    }

    function StorageForGetReful(key, url, callback){
        console.log("StorageForGetReful called:", key, url);
        if(localStorage[key]){
            try {
                var data = JSON.parse(localStorage[key]);
                console.log("从本地存储读取数据:", key, data ? (Array.isArray(data) ? data.length + "条" : "字符串数据") : "空");
                callback(data);
            } catch (e) {
                console.log("解析本地数据失败:", e);
                localStorage.removeItem(key);
                loadFromUrl();
            }
        } else {
            loadFromUrl();
        }

        function loadFromUrl() {
            $.ajax({
                url: url,
                type: "GET",
                dataType: "text",
                success: function (data) {
                    console.log("从URL加载数据成功:", key, "数据长度:", data.length);
                    if(key=="DaxFans"){
                        localStorage[key]=JSON.stringify(data);
                        callback(data);
                    } else {
                        try {
                            var jsonData = JSON.parse(data);
                            localStorage[key]=JSON.stringify(jsonData);
                            callback(jsonData);
                        } catch (e) {
                            console.log("解析JSON失败，作为字符串处理:", e);
                            localStorage[key]=JSON.stringify(data);
                            callback(data);
                        }
                    }
                },
                error: function (error) {
                    console.log("加载数据失败:", error);
                    callback(key === "DaxFans" ? "" : []);
                }
            });
        }
    }

    var setScrollDiv = function () {
        console.log("设置滚动界面，用户数:", userArray.length, "奖品数:", prizeNumber);
        if (prizeNumber <= 5) {
            scrollNumber = prizeNumber;
            $('.tigerMain').addClass('oneTiger');
        } else {
            $('.tigerMain').removeClass('oneTiger');
            scrollNumber = Math.ceil(prizeNumber / 2);
        }

        if (userArray.length <= 5 && prizeNumber > userArray.length) {
            scrollNumber = userArray.length;
            $('.tigerMain').addClass('oneTiger');
        }

        $('.tigerMain').html('');
        for (var i = 0; i < scrollNumber; i++) {
            $('.tigerMain').append('<div class="tigerList"><div><ul></ul></div></div>');
        }
        if (prizeNumber > 5 && prizeNumber < 10) {
            $('.tigerList').each(function () {
                if ($(this).index() > prizeNumber - scrollNumber - 1) {
                    $(this).addClass('oneUser');
                }
            });
        }

        var maxNumber = 0;
        for (var i = 0; i < userArray.length; i++) {
            if (maxNumber == scrollNumber) {
                maxNumber = 0;
            }
            if(userArray[i].IsPrivateteach==true){
                $('.tigerList').eq(maxNumber).find('ul').append('<li data-userid="' + userArray[i].Id + '" data-nickname="' + userArray[i].NickName + '"><img onError="imgError(this)" src="images/itembg.jpg"/><span class="NickName">'+userArray[i].NickName+'</span><span class="Phone">'+userArray[i].CatNumber+'</span></li>');
            }else {
                $('.tigerList').eq(maxNumber).find('ul').append('<li data-userid="' + userArray[i].Id + '" data-nickname="' + userArray[i].NickName + '"><img onError="imgError(this)" src="images/itembg.jpg"/><span class="NickName">'+userArray[i].NickName+'</span><span class="Phone">'+userArray[i].Phone+'</span></li>');
            }

            maxNumber++;
        }
        $(".tigerList").addClass("wait");

        $('.tigerList').each(function () {
            var ul = $($(this).find('ul'));
            if (ul.children().size() > 1) {
                ul.append(ul.html());
                ul.css('top', -ul.height() + ulHeight + 'px');
            } else {
                ul.css('top', '0');
            }
        });

        console.log("滚动界面设置完成");
    };

    // ========== 导出相关函数 ==========
    // ========== 修改后的：检查并显示导出/清空按钮函数 ==========
var checkAndShowExportButton = function() {
    var confirmedCount = getConfirmedWinnerCount();

    // 新增：确保清空历史按钮初始显示
    setTimeout(function() {
        $('#clearHistoryBtn').show();
    }, 100);

    console.log("初始化代码加载完成");

    // 导出按钮只在有已确认中奖记录时显示
    if (confirmedCount > 0) {
        $('#exportBtn').show();
        $('.lottery-info').addClass('has-winners');
    } else {
        $('#exportBtn').hide();
        $('.lottery-info').removeClass('has-winners');
    }

    if (autoSequenceCompleted) {
        $('.lottery-info').addClass('all-completed');
        var completedText = `🎉 所有奖项已抽完，已确认 ${confirmedCount} 人中奖`;
        if (!$('#completedText').length) {
            $('.lottery-info').prepend('<div id="completedText" style="color:#ffd700;font-size:18px;font-weight:bold;margin-bottom:10px;width:100%;text-align:center;">' + completedText + '</div>');
        } else {
            $('#completedText').text(completedText);
        }
    } else {
        $('.lottery-info').removeClass('all-completed');
        $('#completedText').remove();
    }
};

    var exportConfirmedWinners = function() {
        var results = localStorage.getItem("LotteryResults");
        if (!results) {
            CommonShowInfo("暂无已确认的中奖记录", 0);
            return;
        }

        var resultsArray = JSON.parse(results);
        if (resultsArray.length === 0) {
            CommonShowInfo("暂无已确认的中奖记录", 0);
            return;
        }

        var confirmedResults = [];
        var totalConfirmedWinners = 0;

        resultsArray.forEach(function(result) {
            if (result.winners && result.winners.length > 0) {
                confirmedResults.push(result);
                totalConfirmedWinners += result.winners.length;
            }
        });

        if (confirmedResults.length === 0) {
            CommonShowInfo("暂无已确认的中奖记录", 0);
            return;
        }

        var csvContent = "序号,奖项ID,奖项名称,奖项总额,中奖人数,中奖者ID,中奖者姓名,手机号码,中奖时间\n";
        var sequence = 1;

        var sortedResults = confirmedResults.sort(function(a, b) {
            var indexA = -1, indexB = -1;
            for (var i = 0; i < awardSequence.length; i++) {
                if (awardSequence[i].id == a.prizeId) indexA = i;
                if (awardSequence[i].id == b.prizeId) indexB = i;
            }
            return indexA - indexB;
        });

        var exportedWinnerIds = [];

        sortedResults.forEach(function(result) {
            var awardTotal = result.prizeAmount || awardSequence.find(a => a.id == result.prizeId)?.count || 0;
            var awardWinnerCount = result.winners.length;
            var awardSequenceNum = 1;

            result.winners.forEach(function(winner) {
                if (exportedWinnerIds.indexOf(winner.id) === -1) {
                    csvContent += sequence + ",";
                    csvContent += result.prizeId + ",";
                    csvContent += result.prizeName + ",";
                    csvContent += awardTotal + ",";
                    csvContent += awardWinnerCount + ",";
                    csvContent += winner.id + ",";
                    csvContent += winner.name + ",";
                    csvContent += (winner.phone || "") + ",";
                    csvContent += result.timestamp + "\n";

                    sequence++;
                    awardSequenceNum++;
                    exportedWinnerIds.push(winner.id);
                }
            });
        });

        var BOM = "\uFEFF";
        csvContent = BOM + csvContent;

        var today = new Date();
        var year = today.getFullYear();
        var month = String(today.getMonth() + 1).padStart(2, '0');
        var day = String(today.getDate()).padStart(2, '0');
        var hour = String(today.getHours()).padStart(2, '0');
        var minute = String(today.getMinutes()).padStart(2, '0');
        var second = String(today.getSeconds()).padStart(2, '0');
        var fileName = '桦智工程年会已确认获奖名单_' + year + month + day + '_' + hour + minute + second + '.csv';

        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        exportedResults = {
            exportedAt: new Date().toISOString(),
            winnerIds: exportedWinnerIds,
            count: exportedWinnerIds.length,
            type: 'confirmed'
        };

        CommonShowInfo("成功导出 " + exportedWinnerIds.length + " 名已确认获奖人员名单", 1);

        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
    };

    var getConfirmedWinnerCount = function() {
        var results = localStorage.getItem("LotteryResults");
        if (!results) return 0;

        var resultsArray = JSON.parse(results);
        var count = 0;

        resultsArray.forEach(function(result) {
            if (result.winners && result.winners.length > 0) {
                count += result.winners.length;
            }
        });

        return count;
    };

    // ========== 页面初始化 ==========
    // 初始化音频
    initAudio();

    // 恢复音效状态
    var savedSoundState = localStorage.getItem('soundEnabled');
    if (savedSoundState !== null) {
        isSoundEnabled = (savedSoundState === 'true');
    }

    var savedBGMState = localStorage.getItem('bgmEnabled');
    if (savedBGMState !== null) {
        bgmMuted = !(savedBGMState === 'true');
    }

    // 播放背景音乐
    setTimeout(function() {
        playBGM();
    }, 1000);

    // 加载数据
    console.log("开始初始化数据...");
    GetPrize();
    setTimeout(function() {
        GetFans();
    }, 500);

    console.log("初始化代码加载完成");

    // 延迟初始化显示
    setTimeout(function() {
        updateLotteryInfoDisplay();

    }, 1500);
});