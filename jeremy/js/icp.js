
function icp_no_display() {
    var domain = document.domain;
    if (domain !== 'isyin.cn') {
        var t = document.getElementById('icp_link');
        t.style.display = 'none';
    }
}
icp_no_display();
